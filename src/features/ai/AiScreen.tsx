import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { light, useTheme } from '../../shared/theme/ThemeProvider';
import { SectionHeader } from '../../shared/components/SectionHeader';
import { AppModal } from '../../shared/components/AppModal';
import { useAccountingPeriod } from '../accounting/context/PeriodContext';
import { chatWithAi, getAiProvider } from '../../services/ai/service';
import {
  buildContextBlocks,
  CONTEXT_OPTIONS,
  PLAN_RANGE_LABELS,
  ContextId,
  PlanRange,
  ExpensesMode,
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
  CREATION_INTENT_RE,
  type ParsedPlan,
} from '../../services/ai/plan';
import { listCategories } from '../../db/repositories/categories';
import { localDateKey } from '../../shared/utils/date';
import {
  createAiChat,
  listAiChats,
  deleteAiChat,
  touchAiChat,
  addAiMessage,
  listAiMessages,
  updateAiMessagePlan,
  type AiChat,
} from '../../db/repositories/aiChats';

type PlanState = 'pending' | 'applied' | 'dismissed' | 'error';

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  plan?: ParsedPlan;
  planState?: PlanState;
  planSummary?: string;
  planNewCategories?: string[];
};

const SUGGESTIONS = [
  '¿Cómo va mi semana?',
  'Analiza mis gastos del periodo',
  '¿Qué me falta por hacer hoy?',
  'Hazme un plan para mañana',
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatChatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'ayer';
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function storedToMsg(row: {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  plan_json: string | null;
  plan_state: string | null;
  plan_summary: string | null;
  created_at: string;
}): ChatMsg {
  let plan: ParsedPlan | undefined;
  try {
    if (row.plan_json) {
      const parsed = JSON.parse(row.plan_json) as ParsedPlan;
      if (parsed && Array.isArray(parsed.actions)) plan = parsed;
    }
  } catch {
    plan = undefined;
  }
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    createdAt: row.created_at,
    plan,
    planState: (row.plan_state as PlanState | null) ?? undefined,
    planSummary: row.plan_summary ?? undefined,
  };
}

type RowProps = {
  msg: ChatMsg;
  isLight: boolean;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
};

const MessageRow = React.memo(function MessageRow({
  msg,
  isLight,
  onApply,
  onDismiss,
}: RowProps) {
  if (msg.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, isLight && lightStyles.userBubble]}>
          <Text style={[styles.userText, isLight && lightStyles.userText]}>
            {msg.text}
          </Text>
        </View>
        <Text style={[styles.stamp, isLight && lightStyles.stamp]}>
          {formatTime(msg.createdAt)}
        </Text>
      </View>
    );
  }
  return (
    <View>
      <View style={styles.aiRow}>
        <View style={[styles.aiAvatarWrap, isLight && lightStyles.aiAvatarWrap]}>
          <Text style={styles.aiAvatar}>✨</Text>
        </View>
        <View style={styles.aiCol}>
          <View style={[styles.aiBubble, isLight && lightStyles.aiBubble]}>
            <MarkdownText
              text={stripPlanBlock(msg.text)}
              color={isLight ? light.text : '#FAFAFA'}
              style={[styles.aiText, isLight && lightStyles.aiText]}
            />
          </View>
          <Text style={[styles.stamp, isLight && lightStyles.stamp]}>
            {formatTime(msg.createdAt)}
          </Text>
        </View>
      </View>
      {msg.plan && msg.planState === 'pending' ? (
        <View style={[styles.planCard, isLight && lightStyles.planCard]}>
          <Text style={[styles.planTitle, isLight && lightStyles.planTitle]}>
            📋 Plan propuesto · {describePlanDate(msg.plan.date, localDateKey())}
          </Text>
          {msg.plan.actions.map((action, i) => (
            <Text
              key={i}
              style={[styles.planItem, isLight && lightStyles.planItem]}
            >
              {describeAction(action)}
            </Text>
          ))}
          {msg.planNewCategories && msg.planNewCategories.length > 0 ? (
            <Text style={[styles.planItem, isLight && lightStyles.planItem]}>
              🆕 Se creará la categoría: {msg.planNewCategories.join(', ')}
            </Text>
          ) : null}
          <View style={styles.planButtons}>
            <Pressable
              onPress={() => onApply(msg.id)}
              style={[styles.planApply, isLight && lightStyles.planApply]}
            >
              <Text
                style={[
                  styles.planApplyText,
                  isLight && lightStyles.planApplyText,
                ]}
              >
                Aplicar plan
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onDismiss(msg.id)}
              style={[styles.planDismiss, isLight && lightStyles.planDismiss]}
            >
              <Text
                style={[
                  styles.planDismissText,
                  isLight && lightStyles.planDismissText,
                ]}
              >
                Descartar
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {msg.plan && msg.planState === 'applied' ? (
        <View style={[styles.planCard, isLight && lightStyles.planCard]}>
          <Text style={[styles.planTitle, isLight && lightStyles.planTitle]}>
            ✅ Plan aplicado
          </Text>
          <Text style={[styles.planItem, isLight && lightStyles.planItem]}>
            Se creó: {msg.planSummary}.
          </Text>
        </View>
      ) : null}
      {msg.plan && msg.planState === 'error' ? (
        <View style={[styles.planCard, isLight && lightStyles.planCard]}>
          <Text style={[styles.planTitle, isLight && lightStyles.planTitle]}>
            ⚠️ No se pudo aplicar
          </Text>
          <Text style={[styles.planItem, isLight && lightStyles.planItem]}>
            Inténtalo de nuevo.
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export function AiScreen() {
  const theme = useTheme();
  const isLight = theme.isLight;
  const period = useAccountingPeriod();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [providerName, setProviderName] = useState('…');
  const [selected, setSelected] = useState<Set<ContextId>>(
    () => new Set(['expenses'] as ContextId[]),
  );
  const [planRange, setPlanRange] = useState<PlanRange>('day');
  const [expensesMode, setExpensesMode] = useState<ExpensesMode>('current');
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<AiChat[]>([]);
  const [showChats, setShowChats] = useState(false);
  const listRef = useRef<FlatList<ChatMsg> | null>(null);

  useEffect(() => {
    getAiProvider()
      .then(p => setProviderName(p.name))
      .catch(() => setProviderName('Próximamente'));
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      setChats(await listAiChats());
    } catch {
      // chats no disponibles: se sigue sin historial
    }
  }, []);

  const openChat = useCallback(async (id: string | null) => {
    setChatId(id);
    if (!id) {
      setMessages([]);
      return;
    }
    try {
      const rows = await listAiMessages(id);
      const msgs = rows.map(storedToMsg);
      // Recalcula categorías nuevas para planes pendientes.
      for (const m of msgs) {
        if (m.plan && m.planState === 'pending') {
          try {
            m.planNewCategories = await findNewCategoryNames(m.plan);
          } catch {
            m.planNewCategories = [];
          }
        }
      }
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshChats();
      try {
        const list = await listAiChats();
        if (list.length > 0) await openChat(list[0].id);
      } catch {
        // sin historial previo
      }
    })();
  }, [refreshChats, openChat]);

  const newChat = useCallback(() => {
    setChatId(null);
    setMessages([]);
    setShowChats(false);
  }, []);

  const removeChat = useCallback(
    async (id: string) => {
      try {
        await deleteAiChat(id);
      } catch {
        // igual se refresca la lista
      }
      if (id === chatId) {
        setChatId(null);
        setMessages([]);
      }
      await refreshChats();
    },
    [chatId, refreshChats],
  );

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
    setInput('');
    setSending(true);
    try {
      let cid = chatId;
      if (!cid) {
        cid = await createAiChat(text.slice(0, 60));
        setChatId(cid);
      }
      const userId = await addAiMessage(cid, { role: 'user', text });
      const userMsg: ChatMsg = {
        id: userId,
        role: 'user',
        text,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);

      const blocks = await buildContextBlocks(
        [...selected],
        {
          startDate: period.startDate,
          endDate: period.endDate,
          label: period.label,
        },
        { planRange, expensesMode, periodType: period.period },
      );
      const categories = await listCategories().catch(() => []);
      const prompt: AiMessage[] = buildPrompt(
        nextMessages.map(m => ({ role: m.role, content: m.text })),
        blocks,
        { today: localDateKey(), categories: categories.map(c => c.name) },
      );
      const { reply } = await chatWithAi(prompt);
      let plan = extractPlanBlock(reply) ?? undefined;
      // Si el usuario pedía crear algo y la IA no emitió el bloque, se le
      // pide re-emitirlo en un segundo intento (no se muestra como mensaje).
      if (!plan && CREATION_INTENT_RE.test(text)) {
        try {
          const retry = await chatWithAi([
            ...prompt,
            { role: 'assistant', content: reply },
            {
              role: 'user',
              content:
                'Re-emite ahora ÚNICAMENTE el bloque ```plan con las acciones en JSON, sin texto adicional.',
            },
          ]);
          plan = extractPlanBlock(retry.reply) ?? undefined;
        } catch {
          // se queda sin plan; el usuario ve la respuesta normal
        }
      }
      const planNewCategories = plan
        ? await findNewCategoryNames(plan).catch(() => [])
        : undefined;
      const planJson = plan
        ? JSON.stringify({ actions: plan.actions, date: plan.date ?? null })
        : null;
      const asstId = await addAiMessage(cid, {
        role: 'assistant',
        text: reply,
        planJson,
        planState: plan ? 'pending' : null,
      });
      await touchAiChat(cid);
      setMessages(prev => [
        ...prev,
        {
          id: asstId,
          role: 'assistant',
          text: reply,
          createdAt: new Date().toISOString(),
          plan,
          planState: plan ? 'pending' : undefined,
          planNewCategories,
        },
      ]);
      await refreshChats();
    } catch (error) {
      console.warn('[IA] Error al chatear:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: 'assistant',
          text: '⚠️ No se pudo obtener una respuesta. Inténtalo de nuevo.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const applyAiPlan = useCallback(
    async (msgId: string) => {
      const msg = messages.find(m => m.id === msgId);
      if (!msg?.plan || msg.planState !== 'pending') return;
      try {
        const result = await applyPlan(msg.plan, localDateKey());
        const parts: string[] = [];
        if (result.blocks > 0) parts.push(`${result.blocks} bloque(s)`);
        if (result.goals > 0) parts.push(`${result.goals} meta(s)`);
        if (result.notes > 0) parts.push(`${result.notes} nota(s)`);
        const summary = parts.join(', ');
        try {
          await updateAiMessagePlan(msgId, 'applied', summary);
        } catch {
          // el estado en memoria igual se actualiza
        }
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? { ...m, planState: 'applied' as const, planSummary: summary }
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
    },
    [messages],
  );

  const dismissAiPlan = useCallback(async (msgId: string) => {
    try {
      await updateAiMessagePlan(msgId, 'dismissed');
    } catch {
      // igual se actualiza en memoria
    }
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId ? { ...m, planState: 'dismissed' as const } : m,
      ),
    );
  }, []);

  const scrollToEnd = () => {
    listRef.current?.scrollToEnd({ animated: true });
  };

  const contextChipLabel = (id: ContextId): string => {
    const opt = CONTEXT_OPTIONS.find(o => o.id === id);
    const base = `${opt?.icon ?? ''} ${opt?.label ?? id}`;
    if (id === 'plan') return `${base} · ${PLAN_RANGE_LABELS[planRange]}`;
    if (id === 'expenses')
      return `${base} · ${expensesMode === 'current' ? period.label : 'Últimos 3'}`;
    return base;
  };

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <Pressable
          onPress={() => setShowChats(true)}
          style={[styles.topBtn, isLight && lightStyles.topBtn]}
        >
          <Text style={[styles.topBtnText, isLight && lightStyles.topBtnText]}>
            💬 Chats
          </Text>
        </Pressable>
        <Pressable
          onPress={newChat}
          style={[styles.topBtn, isLight && lightStyles.topBtn]}
        >
          <Text style={[styles.topBtnText, isLight && lightStyles.topBtnText]}>
            ＋ Nuevo
          </Text>
        </Pressable>
      </View>

      <SectionHeader eyebrow="ASISTENTE IA" title="Pregunta sobre tus datos" />

      <View style={[styles.badge, isLight && lightStyles.badge]}>
        <Text style={styles.badgeIcon}>✨</Text>
        <Text style={[styles.badgeText, isLight && lightStyles.badgeText]}>
          {providerName === 'Próximamente'
            ? 'Vista previa · IA aún no conectada'
            : `Conectado: ${providerName}`}
        </Text>
      </View>

      <Text style={[styles.section, isLight && lightStyles.section]}>
        Qué quieres compartir
      </Text>
      <View style={styles.contextGrid}>
        {CONTEXT_OPTIONS.map(option => {
          const active = selected.has(option.id);
          const detail =
            option.id === 'expenses'
              ? expensesMode === 'current'
                ? period.label
                : 'Últimos 3'
              : option.id === 'plan'
                ? PLAN_RANGE_LABELS[planRange]
                : undefined;
          return (
            <Pressable
              key={option.id}
              onPress={() => toggleContext(option.id)}
              style={[
                styles.contextCard,
                isLight && lightStyles.contextCard,
                active && styles.contextCardActive,
                isLight && active && lightStyles.contextCardActive,
              ]}
            >
              <Text style={styles.contextIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.contextLabel,
                  isLight && lightStyles.contextLabel,
                  active && styles.contextLabelActive,
                  isLight && active && lightStyles.contextLabelActive,
                ]}
              >
                {option.label}
              </Text>
              {detail ? (
                <Text
                  style={[styles.contextDetail, isLight && lightStyles.contextDetail]}
                >
                  {detail}
                </Text>
              ) : null}
              {active ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {selected.has('plan') || selected.has('expenses') ? (
        <View style={styles.rangeRow}>
          {selected.has('plan') ? (
            <View style={styles.rangeGroup}>
              <Text style={[styles.rangeLabel, isLight && lightStyles.rangeLabel]}>
                Plan:
              </Text>
              {(Object.keys(PLAN_RANGE_LABELS) as PlanRange[]).map(r => (
                <Pressable
                  key={r}
                  onPress={() => setPlanRange(r)}
                  style={[
                    styles.rangeChip,
                    isLight && lightStyles.rangeChip,
                    planRange === r && styles.rangeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rangeChipText,
                      isLight && lightStyles.rangeChipText,
                      planRange === r && styles.rangeChipTextActive,
                    ]}
                  >
                    {PLAN_RANGE_LABELS[r]}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {selected.has('expenses') ? (
            <View style={styles.rangeGroup}>
              <Text style={[styles.rangeLabel, isLight && lightStyles.rangeLabel]}>
                Gastos:
              </Text>
              {(
                [
                  ['current', period.label],
                  ['last3', 'Últimos 3'],
                ] as [ExpensesMode, string][]
              ).map(([mode, label]) => (
                <Pressable
                  key={mode}
                  onPress={() => setExpensesMode(mode)}
                  style={[
                    styles.rangeChip,
                    isLight && lightStyles.rangeChip,
                    expensesMode === mode && styles.rangeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rangeChipText,
                      isLight && lightStyles.rangeChipText,
                      expensesMode === mode && styles.rangeChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={[styles.hint, isLight && lightStyles.hint]}>
        Solo se envía a la IA lo que selecciones aquí. Nada más sale del
        teléfono.
      </Text>

      {messages.length === 0 ? (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map(s => (
            <Pressable
              key={s}
              onPress={() => send(s)}
              style={[styles.suggestion, isLight && lightStyles.suggestion]}
            >
              <Text
                style={[styles.suggestionText, isLight && lightStyles.suggestionText]}
              >
                {s}
              </Text>
              <Text style={styles.suggestionArrow}>→</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  const selectedIds = [...selected];

  return (
    <SafeAreaView style={[styles.container, isLight && lightStyles.container]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageRow
              msg={item}
              isLight={isLight}
              onApply={applyAiPlan}
              onDismiss={dismissAiPlan}
            />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={
            sending ? (
              <View style={styles.aiRow}>
                <View style={[styles.aiAvatarWrap, isLight && lightStyles.aiAvatarWrap]}>
                  <Text style={styles.aiAvatar}>✨</Text>
                </View>
                <View
                  style={[styles.aiBubble, isLight && lightStyles.aiBubble]}
                >
                  <Text style={[styles.typing, isLight && lightStyles.typing]}>
                    Escribiendo…
                  </Text>
                </View>
              </View>
            ) : undefined
          }
        />

        {selectedIds.length > 0 ? (
          <View style={[styles.chipsWrap, isLight && lightStyles.chipsWrap]}>
            <FlatList
              data={selectedIds}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={id => id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chips}
              renderItem={({ item: id }) => (
                <Pressable
                  key={id}
                  onPress={() => toggleContext(id)}
                  style={[styles.chip, isLight && lightStyles.chip]}
                >
                  <Text style={[styles.chipText, isLight && lightStyles.chipText]}>
                    {contextChipLabel(id)} ×
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        <View style={[styles.inputRow, isLight && lightStyles.inputRow]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta…"
            placeholderTextColor={isLight ? '#8A8474' : '#75798B'}
            style={[styles.input, isLight && lightStyles.input]}
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
              isLight && lightStyles.send,
              (sending || input.trim().length === 0) && styles.sendDisabled,
            ]}
          >
            <Text style={[styles.sendText, isLight && lightStyles.sendText]}>
              ↑
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AppModal
        visible={showChats}
        title="Conversaciones"
        onClose={() => setShowChats(false)}
      >
        <Pressable
          onPress={newChat}
          style={[styles.newChatBtn, isLight && lightStyles.newChatBtn]}
        >
          <Text style={[styles.newChatText, isLight && lightStyles.newChatText]}>
            ＋ Nueva conversación
          </Text>
        </Pressable>
        {chats.length === 0 ? (
          <Text style={[styles.emptyChats, isLight && lightStyles.emptyChats]}>
            Aún no tienes conversaciones guardadas.
          </Text>
        ) : null}
        {chats.map(chat => (
          <View
            key={chat.id}
            style={[styles.chatRow, isLight && lightStyles.chatRow]}
          >
            <Pressable
              style={styles.chatRowMain}
              onPress={() => {
                setShowChats(false);
                openChat(chat.id);
              }}
            >
              <Text
                style={[styles.chatTitle, isLight && lightStyles.chatTitle]}
                numberOfLines={1}
              >
                {chat.id === chatId ? '● ' : ''}
                {chat.title}
              </Text>
              <Text style={[styles.chatDate, isLight && lightStyles.chatDate]}>
                {formatChatDate(chat.updated_at)}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => removeChat(chat.id)}
              hitSlop={10}
              style={styles.chatDelete}
            >
              <Text style={styles.chatDeleteText}>🗑</Text>
            </Pressable>
          </View>
        ))}
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0F' },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 12, gap: 16 },
  headerWrap: { gap: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  topBarSpacer: { flex: 1 },
  topBtn: {
    backgroundColor: '#191919',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topBtnText: { color: '#C7C7CC', fontSize: 12, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#252525',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  badgeIcon: { fontSize: 15 },
  badgeText: { color: '#FAFAFA', fontSize: 12, fontWeight: '600' },
  section: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
  },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contextCard: {
    width: '48%',
    backgroundColor: '#191919',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  contextCardActive: { borderColor: '#555555', backgroundColor: '#282828' },
  contextIcon: { fontSize: 20 },
  contextLabel: { color: '#FAFAFA', fontSize: 13, fontWeight: '600' },
  contextLabelActive: { color: '#FAFAFA' },
  contextDetail: { color: '#A3A3A3', fontSize: 11, textTransform: 'capitalize' },
  check: {
    position: 'absolute',
    top: 8,
    right: 10,
    color: '#65D6C0',
    fontWeight: '900',
    fontSize: 14,
  },
  rangeRow: { gap: 8 },
  rangeGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rangeLabel: { color: '#A3A3A3', fontSize: 12, fontWeight: '600' },
  rangeChip: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#191919',
  },
  rangeChipActive: { borderColor: '#555555', backgroundColor: '#282828' },
  rangeChipText: { color: '#A3A3A3', fontSize: 12, fontWeight: '600' },
  rangeChipTextActive: { color: '#FAFAFA' },
  hint: { color: '#A3A3A3', fontSize: 12, lineHeight: 17, marginTop: -4 },
  suggestions: { gap: 8, marginTop: 4 },
  suggestion: {
    backgroundColor: '#191919',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionText: { color: '#FAFAFA', fontSize: 14, fontWeight: '600', flex: 1 },
  suggestionArrow: { color: '#65D6C0', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  userRow: { alignItems: 'flex-end', marginTop: 2 },
  userBubble: {
    backgroundColor: '#FAFAFA',
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 11,
    maxWidth: '85%',
  },
  userText: { color: '#0E0E0F', fontSize: 14, lineHeight: 20 },
  aiRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 2 },
  aiAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  aiAvatar: { fontSize: 15 },
  aiCol: { flex: 1 },
  aiBubble: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  aiText: { color: '#FAFAFA', fontSize: 14, lineHeight: 21 },
  stamp: { color: '#A3A3A3', fontSize: 10, marginTop: 3, marginHorizontal: 4 },
  typing: { color: '#A3A3A3', fontSize: 14, fontStyle: 'italic' },
  planCard: {
    marginTop: 8,
    marginLeft: 39,
    backgroundColor: '#252525',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  planTitle: { color: '#FAFAFA', fontSize: 14, fontWeight: '700' },
  planItem: { color: '#C7C7CC', fontSize: 13, lineHeight: 19 },
  planButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  planApply: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  planApplyText: { color: '#0E0E0F', fontSize: 14, fontWeight: '700' },
  planDismiss: {
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  planDismissText: { color: '#C7C7CC', fontSize: 14, fontWeight: '600' },
  chipsWrap: {
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    paddingVertical: 10,
  },
  chips: {
    paddingHorizontal: 18,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#252525',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: { color: '#C7C7CC', fontSize: 12, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    backgroundColor: '#0E0E0F',
  },
  input: {
    flex: 1,
    backgroundColor: '#191919',
    borderRadius: 16,
    color: '#FAFAFA',
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 110,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#0E0E0F', fontSize: 20, fontWeight: '900' },
  newChatBtn: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginBottom: 4,
  },
  newChatText: { color: '#FAFAFA', fontSize: 14, fontWeight: '700' },
  emptyChats: { color: '#A3A3A3', fontSize: 13, textAlign: 'center', marginTop: 12 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chatRowMain: { flex: 1, gap: 2 },
  chatTitle: { color: '#FAFAFA', fontSize: 14, fontWeight: '700' },
  chatDate: { color: '#A3A3A3', fontSize: 11 },
  chatDelete: { padding: 6 },
  chatDeleteText: { fontSize: 16 },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  topBtn: { backgroundColor: light.surface, borderColor: light.border },
  topBtnText: { color: light.accent },
  badge: { backgroundColor: light.chipActive, borderColor: light.border },
  badgeText: { color: light.accent },
  section: { color: light.accent },
  contextCard: { backgroundColor: light.surface, borderColor: light.border },
  contextCardActive: { borderColor: light.accent, backgroundColor: light.chipActive },
  contextLabel: { color: light.text },
  contextLabelActive: { color: light.accent },
  contextDetail: { color: light.muted },
  rangeLabel: { color: light.muted },
  rangeChip: { backgroundColor: light.surface, borderColor: light.border },
  rangeChipText: { color: light.muted },
  hint: { color: light.muted },
  suggestion: { backgroundColor: light.surface, borderColor: light.border },
  suggestionText: { color: light.accent },
  userBubble: { backgroundColor: light.accent },
  userText: { color: '#FFFFFF' },
  aiAvatarWrap: { backgroundColor: light.chipActive, borderColor: light.border },
  aiBubble: { backgroundColor: light.surface, borderColor: light.border },
  aiText: { color: light.text },
  stamp: { color: '#A09A8E' },
  typing: { color: light.muted },
  planCard: { backgroundColor: light.chipActive, borderColor: light.border },
  planTitle: { color: light.accent },
  planItem: { color: '#5A5468' },
  planApply: { backgroundColor: light.text },
  planApplyText: { color: '#FFFFFF' },
  planDismiss: { borderColor: light.border },
  planDismissText: { color: light.muted },
  chipsWrap: { borderTopColor: light.border },
  chip: { backgroundColor: light.chipActive, borderColor: light.border },
  chipText: { color: light.accent },
  inputRow: { borderTopColor: light.border, backgroundColor: light.background },
  input: {
    backgroundColor: light.surface,
    borderColor: light.border,
    color: light.text,
  },
  send: { backgroundColor: light.text },
  sendText: { color: '#FFFFFF' },
  newChatBtn: { backgroundColor: light.chipActive, borderColor: light.border },
  newChatText: { color: light.accent },
  emptyChats: { color: light.muted },
  chatRow: { backgroundColor: light.surface, borderColor: light.border },
  chatTitle: { color: light.text },
  chatDate: { color: light.muted },
});
