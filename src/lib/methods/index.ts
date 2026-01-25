// Method cloud system - philosophical/analytical spirits that possess the thinking

export interface Method {
  id: string;
  name: string;
  source: string;
  color: string;
  letterSpacing: number;
  resonantSymbols: string[];
  vocabulary: string[];
  expandedVocabulary?: string[]; // broader semantic field words for detection
  domains: string[];
  compatibleWith: string[];
  tensionsWith: string[];
  promptContent: string;
}

// Import all methods
import barthes from './barthes.json';
import warburg from './warburg.json';
import benjamin from './benjamin.json';
import deleuze from './deleuze.json';
import wittgenstein from './wittgenstein.json';
import bateson from './bateson.json';
import simmel from './simmel.json';
import ibnKhaldun from './ibn-khaldun.json';
import grothendieck from './grothendieck.json';
import calasso from './calasso.json';
import borges from './borges.json';
import derrida from './derrida.json';
import herzog from './herzog.json';
import flusser from './flusser.json';

// The method cloud
export const methods: Method[] = [
  barthes,
  warburg,
  benjamin,
  deleuze,
  wittgenstein,
  bateson,
  simmel,
  ibnKhaldun,
  grothendieck,
  calasso,
  borges,
  derrida,
  herzog,
  flusser,
] as Method[];

// Get method by ID
export function getMethod(id: string): Method | undefined {
  return methods.find(m => m.id === id);
}

// Get methods by IDs
export function getMethods(ids: string[]): Method[] {
  return ids.map(id => getMethod(id)).filter((m): m is Method => m !== undefined);
}

// Get all method IDs
export function getMethodIds(): string[] {
  return methods.map(m => m.id);
}

// Get methods by domain
export function getMethodsByDomain(domain: string): Method[] {
  return methods.filter(m => m.domains.includes(domain));
}

// Get compatible methods for a given method
export function getCompatibleMethods(methodId: string): Method[] {
  const method = getMethod(methodId);
  if (!method) return [];
  return getMethods(method.compatibleWith);
}

// Get methods that create productive tension with a given method
export function getTensionMethods(methodId: string): Method[] {
  const method = getMethod(methodId);
  if (!method) return [];
  return getMethods(method.tensionsWith);
}
