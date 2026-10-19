import { norm } from './apps';
import { KEYS } from './types';

/** The contract's app names, always allowed so the model can name an app the TV lacks. */
export const KNOWN_APPS = ['netflix', 'prime', 'hotstar', 'youtube', 'jiocinema', 'apple tv', 'zee5', 'sonyliv', 'crunchyroll'];

const lit = (s: string) => JSON.stringify(JSON.stringify(s)); // GBNF literal of a JSON string

/**
 * GBNF grammar that only admits one assistant action as compact JSON, with `app` limited to the
 * TV's apps (plus the contract's names) and `keys` limited to the contract's key names.
 */
export function buildGrammar(appNames: string[]): string {
  const apps = Array.from(new Set([...appNames.map(norm), ...KNOWN_APPS])).filter((a) => a && a.length <= 40);
  return [
    'root ::= "{" ws "\\"action\\"" ws ":" ws ( play | launch | keys | type | search | continue | reply ) ws "}"',
    'continue ::= "\\"continue\\"" ( ws "," ws "\\"title\\"" ws ":" ws str )? ( ws "," ws "\\"app\\"" ws ":" ws app )?',
    'play ::= "\\"play\\"" ws "," ws "\\"title\\"" ws ":" ws str ( ws "," ws "\\"app\\"" ws ":" ws app )?',
    'launch ::= "\\"launch\\"" ws "," ws "\\"app\\"" ws ":" ws app',
    'keys ::= "\\"keys\\"" ws "," ws "\\"keys\\"" ws ":" ws "[" ws key ( ws "," ws key ){0,11} ws "]"',
    'type ::= "\\"type\\"" ws "," ws "\\"text\\"" ws ":" ws str ws "," ws "\\"submit\\"" ws ":" ws ( "true" | "false" )',
    'search ::= "\\"search\\"" ws "," ws "\\"query\\"" ws ":" ws str',
    'reply ::= "\\"reply\\"" ws "," ws "\\"text\\"" ws ":" ws str',
    `app ::= ${apps.map(lit).join(' | ')}`,
    `key ::= ${KEYS.map(lit).join(' | ')}`,
    'str ::= "\\"" char{1,120} "\\""',
    'char ::= [^"\\\\\\x7F\\x00-\\x1F] | "\\\\" ["\\\\/bfnrt]',
    'ws ::= " "?',
  ].join('\n');
}
