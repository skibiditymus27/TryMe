export type Contact = {
  id: string;
  name: string;
  status: 'Online' | 'Away' | 'Offline';
};

export const CONTACTS: Contact[] = [
  { id: 'aurora', name: 'Aurora Quinn', status: 'Online' },
  { id: 'cipher', name: 'Cipher Fox', status: 'Away' },
  { id: 'nebula', name: 'Nebula Reyes', status: 'Online' },
  { id: 'vault', name: 'Vault-7', status: 'Offline' },
  { id: 'lattice', name: 'Lattice Bloom', status: 'Online' },
  { id: 'sable', name: 'Sable Ion', status: 'Offline' }
];
