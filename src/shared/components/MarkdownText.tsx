import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

/**
 * Renderizador markdown mínimo para las burbujas del chat de IA.
 * Soporta: **negrita**, *cursiva*, `código`, ##/### títulos,
 * listas (-, •, *) y numeradas (1.), y saltos de línea.
 * A prueba de fallos: cualquier entrada rara se muestra como texto plano.
 */

type InlineNode = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

function parseInline(line: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /(\*\*.+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  // Protección contra entradas patológicas.
  let guard = 0;
  while ((m = re.exec(line)) !== null && guard++ < 200) {
    if (m.index > last) nodes.push({ text: line.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push({ text: tok.slice(2, -2), bold: true });
    else if (tok.startsWith('*')) nodes.push({ text: tok.slice(1, -1), italic: true });
    else nodes.push({ text: tok.slice(1, -1), code: true });
    last = m.index + tok.length;
    if (tok.length === 0) break;
  }
  if (last < line.length) nodes.push({ text: line.slice(last) });
  return nodes.length > 0 ? nodes : [{ text: line }];
}

type Block =
  | { kind: 'header'; level: number; nodes: InlineNode[] }
  | { kind: 'list'; ordered: boolean; items: InlineNode[][] }
  | { kind: 'para'; nodes: InlineNode[] };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    const header = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (header) {
      blocks.push({
        kind: 'header',
        level: header[1].length,
        nodes: parseInline(header[2]),
      });
      i++;
      continue;
    }
    const bullet = /^(\s*)[-•*]\s+(.*)$/.exec(line);
    const numbered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = !bullet;
      const items: InlineNode[][] = [];
      while (i < lines.length) {
        const lm = numbered
          ? /^(\s*)\d+[.)]\s+(.*)$/.exec(lines[i])
          : /^(\s*)[-•*]\s+(.*)$/.exec(lines[i]);
        if (!lm) break;
        items.push(parseInline(lm[2]));
        i++;
        if (items.length > 60) break;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    blocks.push({ kind: 'para', nodes: parseInline(trimmed) });
    i++;
  }
  return blocks;
}

type Props = {
  text: string;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function MarkdownText({ text, color = '#FAFAFA', style }: Props) {
  let blocks: Block[];
  try {
    blocks = parseBlocks(text);
  } catch {
    return <Text style={[{ color }, style]}>{text}</Text>;
  }
  if (blocks.length === 0) return <Text style={[{ color }, style]}>{text}</Text>;

  return (
    <Text style={[{ color }, style]}>
      {blocks.map((block, bi) => {
        const key = `b${bi}`;
        if (block.kind === 'header') {
          return (
            <Text key={key} style={{ fontWeight: '800', fontSize: block.level === 1 ? 17 : 15 }}>
              {renderInline(block.nodes, key, color)}
              {'\n'}
            </Text>
          );
        }
        if (block.kind === 'list') {
          return (
            <Text key={key}>
              {block.items.map((item, ii) => (
                <Text key={`${key}i${ii}`}>
                  {'  '}
                  <Text style={{ color: '#65D6C0', fontWeight: '900' }}>
                    {block.ordered ? `${ii + 1}. ` : '• '}
                  </Text>
                  {renderInline(item, `${key}i${ii}`, color)}
                  {'\n'}
                </Text>
              ))}
            </Text>
          );
        }
        return (
          <Text key={key}>
            {renderInline(block.nodes, key, color)}
            {bi < blocks.length - 1 ? '\n' : ''}
          </Text>
        );
      })}
    </Text>
  );
}

function renderInline(nodes: InlineNode[], key: string, color: string) {
  return nodes.map((node, ni) => (
    <Text
      key={`${key}n${ni}`}
      style={[
        node.bold && { fontWeight: '800' },
        node.italic && { fontStyle: 'italic' },
        node.code && {
          fontFamily: 'monospace',
          backgroundColor: 'rgba(127,127,127,0.18)',
          color,
        },
      ]}
    >
      {node.text}
    </Text>
  ));
}
