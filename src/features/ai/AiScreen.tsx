import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { light, useTheme } from '../../shared/theme/ThemeProvider';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { useAccountingPeriod } from '../accounting/context/PeriodContext';
import { chatWithAi, getAiProvider } from '../../services/ai/service';
import {
  buildContextBlocks,
  CONTEXT_OPTIONS,
  ContextId,
} from '../../services/ai/context';
import { buildPrompt } from '../../services/ai/prompts';
import type { AiMessage } from '../../services/ai/types';
import { MarkdownText } from '../../shared/components/MarkdownText';
import {
  extractPlanBlock,
  stripPlanBlock,
  applyPlan,
  describeAction,
  describePlanDate,
  findNewCategoryNames,
  type ParsedPlan,
} from '../../services/ai/plan';
import { listCategories } from '../../db/repositories/categories';
import { localDateKey } from '../../shared/utils/date';

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  plan?: ParsedPlan;
  planState?: 'pending' | 'applied' | 'dismissed' | 'error';
  planSummary?: string;
  planNewCategories?: string[];
};

const SUGGESTIONS = [
  '¿Cómo va mi semana?',
  'Analiza mis gastos del periodo',
  '¿Qué me falta por hacer hoy?',
];

export function AiScreen() {
  const theme = useTheme();
  const period = useAccountingPeriod();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [providerName, setProviderName] = useState('…');
  const [selected, setSelected] = useState<Set<ContextId>>(
    () => new Set(['expenses'] as ContextId[]),
  );
  const scrollHandle = useRef<unknown>(null);

  useEffect(() => {
    getAiProvider()
      .then(p => setProviderName(p.name))
      .catch(() => setProviderName('Próximamente'));
  }, []);

  const toggleContext = (id: ContextId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || sending) return;
    const userMsg: ChatMsg = { id: uuidv4(), role: 'user', text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    try {
      const blocks = await buildContextBlocks([...selected], {
        startDate: period.startDate,
        endDate: period.endDate,
        label: period.label,
      });
      const categories = await listCategories().catch(() => []);
      const prompt: AiMessage[] = buildPrompt(
        nextMessages.map(m => ({ role: m.role, content: m.text })),
        blocks,
        {
          today: localDateKey(),
          categories: categories.map(c => c.name),
        },
      );
      const { reply } = await chatWithAi(prompt);
      const plan = extractPlanBlock(reply) ?? undefined;
      const planNewCategories = plan ? await findNewCategoryNames(plan).catch(() => []) : undefined;
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          text: reply,
          plan,
          planState: plan ? 'pending' : undefined,
          planNewCategories,
        },
      ]);
    } catch (error) {
      console.warn('[IA] Error al chatear:', error);
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          text: '⚠️ No se pudo obtener una respuesta. Inténtalo de nuevo.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const selectedLabels = CONTEXT_OPTIONS.filter(o => selected.has(o.id));

  const applyAiPlan = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg?.plan || msg.planState !== 'pending') return;
    try {
      const result = await applyPlan(msg.plan, localDateKey());
      const parts: string[] = [];
      if (result.blocks > 0) parts.push(`${result.blocks} bloque(s) del día`);
      if (result.goals > 0) parts.push(`${result.goals} meta(s)`);
      if (result.notes > 0) parts.push(`${result.notes} nota(s)`);
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? { ...m, planState: 'applied' as const, planSummary: parts.join(', ') }
            : m,
        ),
      );
    } catch (error) {
      console.warn('[IA] Error al aplicar el plan:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId ? { ...m, planState: 'error' as const } : m,
        ),
      );
    }
  };

  const dismissAiPlan = (msgId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId ? { ...m, planState: 'dismissed' as const } : m,
      ),
    );
  };

  return (
    <SafeAreaView style={[styles.container, theme.isLight && lightStyles.container]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ref={instance => {
            scrollHandle.current = instance;
          }}
          onContentSizeChange={() => {
            const handle = scrollHandle.current as {
              scrollToEnd?: (options: { animated?: boolean }) => void;
            } | null;
            handle?.scrollToEnd?.({ animated: true });
          }}
        >
          <SectionHeader eyebrow="ASISTENTE IA" title="Pregunta sobre tus datos" />

          <View style={[styles.badge, theme.isLight && lightStyles.badge]}>
            <Text style={styles.badgeIcon}>✨</Text>
            <Text style={[styles.badgeText, theme.isLight && lightStyles.badgeText]}>
              {providerName === 'Próximamente'
                ? 'Vista previa · IA aún no conectada'
                : `Conectado: ${providerName}`}
            </Text>
          </View>

          <Text style={[styles.section, theme.isLight && lightStyles.section]}>
            Qué quieres compartir
          </Text>
          <View style={styles.contextGrid}>
            {CONTEXT_OPTIONS.map(option => {
              const active = selected.has(option.id);
              const detail =
                option.id === 'expenses' ? period.label : undefined;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => toggleContext(option.id)}
                  style={[
                    styles.contextCard,
                    theme.isLight && lightStyles.contextCard,
                    active && styles.contextCardActive,
                    active && theme.isLight && lightStyles.contextCardActive,
                  ]}
                >
                  <Text style={styles.contextIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.contextLabel,
                      theme.isLight && lightStyles.contextLabel,
                      active && styles.contextLabelActive,
                      active && theme.isLight && lightStyles.contextLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {detail ? (
                    <Text
                      style={[
                        styles.contextDetail,
                        theme.isLight && lightStyles.contextDetail,
                      ]}
                      numberOfLines={1}
                    >
                      {detail}
                    </Text>
                  ) : null}
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, theme.isLight && lightStyles.hint]}>
            Solo se envía lo que selecciones aquí, mensaje a mensaje. Nada
            sale del teléfono en segundo plano.
          </Text>

          {messages.length === 0 ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  style={[
                    styles.suggestion,
                    theme.isLight && lightStyles.suggestion,
                  ]}
                >
                  <Text
                    style={[
                      styles.suggestionText,
                      theme.isLight && lightStyles.suggestionText,
                    ]}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.messages}>
              {messages.map(msg =>
                msg.role === 'user' ? (
                  <View key={msg.id} style={styles.userRow}>
                    <View
                      style={[
                        styles.userBubble,
                        theme.isLight && lightStyles.userBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.userText,
                          theme.isLight && lightStyles.userText,
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View key={msg.id}>
                    <View style={styles.aiRow}>
                      <Text style={styles.aiAvatar}>✨</Text>
                      <View
                        style={[
                          styles.aiBubble,
                          theme.isLight && lightStyles.aiBubble,
                        ]}
                      >
                        <MarkdownText
                          text={stripPlanBlock(msg.text)}
                          color={theme.isLight ? '#2B2620' : '#EDE9F6'}
                          style={[
                            styles.aiText,
                            theme.isLight && lightStyles.aiText,
                          ]}
                        />
                      </View>
                    </View>
                    {msg.plan && msg.planState === 'pending' ? (
                      <View
                        style={[styles.planCard, theme.isLight && lightStyles.planCard]}
                      >
                        <Text style={[styles.planTitle, theme.isLight && lightStyles.planTitle]}>
                          📋 Plan propuesto · {describePlanDate(msg.plan.date, localDateKey())}
                        </Text>
                        {msg.plan.actions.map((action, i) => (
                          <Text
                            key={i}
                            style={[styles.planItem, theme.isLight && lightStyles.planItem]}
                          >
                            {describeAction(action)}
                          </Text>
                        ))}
                        {msg.planNewCategories && msg.planNewCategories.length > 0 ? (
                          <Text style={[styles.planItem, theme.isLight && lightStyles.planItem]}>
                            🆕 Se creará la categoría: {msg.planNewCategories.join(', ')}
                          </Text>
                        ) : null}
                        <View style={styles.planButtons}>
                          <Pressable
                            onPress={() => applyAiPlan(msg.id)}
                            style={styles.planApply}
                          >
                            <Text style={styles.planApplyText}>Aplicar plan</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => dismissAiPlan(msg.id)}
                            style={[styles.planDismiss, theme.isLight && lightStyles.planDismiss]}
                          >
                            <Text style={[styles.planDismissText, theme.isLight && lightStyles.planDismissText]}>
                              Descartar
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                    {msg.plan && msg.planState === 'applied' ? (
                      <View
                        style={[styles.planCard, theme.isLight && lightStyles.planCard]}
                      >
                        <Text style={[styles.planTitle, theme.isLight && lightStyles.planTitle]}>
                          ✅ Plan aplicado
                        </Text>
                        <Text style={[styles.planItem, theme.isLight && lightStyles.planItem]}>
                          Se creó: {msg.planSummary}.
                        </Text>
                      </View>
                    ) : null}
                    {msg.plan && msg.planState === 'error' ? (
                      <View
                        style={[styles.planCard, theme.isLight && lightStyles.planCard]}
                      >
                        <Text style={[styles.planTitle, theme.isLight && lightStyles.planTitle]}>
                          ⚠️ No se pudo aplicar
                        </Text>
                        <Text style={[styles.planItem, theme.isLight && lightStyles.planItem]}>
                          Inténtalo de nuevo.
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ),
              )}
              {sending ? (
                <View style={styles.aiRow}>
                  <Text style={styles.aiAvatar}>✨</Text>
                  <View
                    style={[styles.aiBubble, theme.isLight && lightStyles.aiBubble]}
                  >
                    <Text
                      style={[styles.typing, theme.isLight && lightStyles.typing]}
                    >
                      Escribiendo…
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        {selectedLabels.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {selectedLabels.map(option => (
              <Pressable
                key={option.id}
                onPress={() => toggleContext(option.id)}
                style={[styles.chip, theme.isLight && lightStyles.chip]}
              >
                <Text
                  style={[styles.chipText, theme.isLight && lightStyles.chipText]}
                >
                  {option.icon} {option.id === 'expenses' ? `Gastos · ${period.label}` : option.label} ×
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.inputRow, theme.isLight && lightStyles.inputRow]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta…"
            placeholderTextColor={theme.isLight ? '#8A8474' : '#75798B'}
            style={[styles.input, theme.isLight && lightStyles.input]}
            multiline
            maxLength={1000}
            editable={!sending}
            onSubmitEditing={() => send()}
          />
          <Pressable
            onPress={() => send()}
            disabled={sending || input.trim().length === 0}
            style={[
              styles.send,
              (sending || input.trim().length === 0) && styles.sendDisabled,
            ]}
          >
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D14' },
  flex: { flex: 1 },
  content: { padding: 18, paddingBottom: 12, gap: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#211C33',
    borderWidth: 1,
    borderColor: '#4A3D6B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  badgeIcon: { fontSize: 15 },
  badgeText: { color: '#CDB7F2', fontSize: 12, fontWeight: '700' },
  section: {
    color: '#C9B6E8',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contextCard: {
    width: '48%',
    backgroundColor: '#181B25',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262C3E',
    padding: 12,
    gap: 4,
  },
  contextCardActive: { borderColor: '#A78BFA', backgroundColor: '#221D33' },
  contextIcon: { fontSize: 20 },
  contextLabel: { color: '#EDE9F6', fontSize: 13, fontWeight: '700' },
  contextLabelActive: { color: '#D9C9F3' },
  contextDetail: { color: '#8E94A5', fontSize: 11, textTransform: 'capitalize' },
  check: {
    position: 'absolute',
    top: 8,
    right: 10,
    color: '#A78BFA',
    fontWeight: '900',
    fontSize: 14,
  },
  hint: { color: '#73798B', fontSize: 12, lineHeight: 17, marginTop: -4 },
  suggestions: { gap: 8, marginTop: 4 },
  suggestion: {
    backgroundColor: '#181B25',
    borderWidth: 1,
    borderColor: '#262C3E',
    borderRadius: 12,
    padding: 13,
  },
  suggestionText: { color: '#CDB7F2', fontSize: 14, fontWeight: '600' },
  messages: { gap: 10, marginTop: 2 },
  userRow: { alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: '#A78BFA',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  userText: { color: '#171421', fontSize: 14, lineHeight: 20 },
  aiRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  aiAvatar: { fontSize: 16, marginTop: 8 },
  aiBubble: {
    backgroundColor: '#181B25',
    borderWidth: 1,
    borderColor: '#262C3E',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flex: 1,
  },
  aiText: { color: '#EDE9F6', fontSize: 14, lineHeight: 21 },
  typing: { color: '#8E94A5', fontSize: 14, fontStyle: 'italic' },
  planCard: {
    marginTop: 8,
    marginLeft: 24,
    backgroundColor: '#1B1F2E',
    borderWidth: 1,
    borderColor: '#4A3D6B',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  planTitle: { color: '#D9C9F3', fontSize: 14, fontWeight: '800' },
  planItem: { color: '#C9B6E8', fontSize: 13, lineHeight: 19 },
  planButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  planApply: {
    backgroundColor: '#A78BFA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  planApplyText: { color: '#171421', fontSize: 14, fontWeight: '800' },
  planDismiss: {
    borderWidth: 1,
    borderColor: '#3A3F52',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  planDismissText: { color: '#8E94A5', fontSize: 14, fontWeight: '700' },
  chips: { paddingHorizontal: 18, paddingVertical: 8, gap: 8 },
  chip: {
    backgroundColor: '#2A2140',
    borderWidth: 1,
    borderColor: '#4A3D6B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: { color: '#D9C9F3', fontSize: 12, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2230',
    backgroundColor: '#0B0D14',
  },
  input: {
    flex: 1,
    backgroundColor: '#181B25',
    borderWidth: 1,
    borderColor: '#262C3E',
    borderRadius: 14,
    color: '#F8F7FB',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    maxHeight: 110,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#171421', fontSize: 20, fontWeight: '900' },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  badge: { backgroundColor: '#F1EAFB', borderColor: '#C9B3E8' },
  badgeText: { color: light.accent },
  section: { color: light.accent },
  contextCard: { backgroundColor: light.surface, borderColor: light.border },
  contextCardActive: { borderColor: light.accent, backgroundColor: '#F1EAFB' },
  contextLabel: { color: light.text },
  contextLabelActive: { color: light.accent },
  contextDetail: { color: light.muted },
  hint: { color: light.muted },
  suggestion: { backgroundColor: light.surface, borderColor: light.border },
  suggestionText: { color: light.accent },
  userBubble: { backgroundColor: light.accent },
  userText: { color: '#FFFFFF' },
  aiBubble: { backgroundColor: light.surface, borderColor: light.border },
  aiText: { color: light.text },
  typing: { color: light.muted },
  planCard: { backgroundColor: '#F1EAFB', borderColor: '#C9B3E8' },
  planTitle: { color: light.accent },
  planItem: { color: '#5A5468' },
  planDismiss: { borderColor: light.border },
  planDismissText: { color: light.muted },
  chip: { backgroundColor: '#F1EAFB', borderColor: '#C9B3E8' },
  chipText: { color: light.accent },
  inputRow: { borderTopColor: light.border, backgroundColor: light.background },
  input: {
    backgroundColor: light.surface,
    borderColor: light.border,
    color: light.text,
  },
});
