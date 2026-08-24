'use client';

import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function ConvexTestPage() {
  const { signIn, signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const [phone, setPhone] = useState('0612345678');
  const [password, setPassword] = useState('testpass123');
  const [firstName, setFirstName] = useState('Test');
  const [lastName, setLastName] = useState('User');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(flow: 'signUp' | 'signIn') {
    setError('');
    setBusy(true);
    try {
      await signIn('phone-password', { phone, password, firstName, lastName, flow });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: 'monospace', maxWidth: 480 }}>
      <h1>Convex Auth test (phone-password)</h1>
      <p>viewer: {viewer === undefined ? 'loading...' : JSON.stringify(viewer)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="phone" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="firstName" />
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="lastName" />
      </div>
      <button disabled={busy} onClick={() => run('signUp')}>signUp</button>{' '}
      <button disabled={busy} onClick={() => run('signIn')}>signIn</button>{' '}
      <button disabled={busy} onClick={() => signOut()}>signOut</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
