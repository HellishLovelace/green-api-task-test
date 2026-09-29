import { useState } from 'react';
import type { Credentials } from './api/greenApi';
import { LoginScreen } from './components/LoginScreen';
import { MessengerScreen } from './components/MessengerScreen';
import { clearCredentials, loadCredentials, saveCredentials } from './utils/storage';

/** Корень приложения: без учётных данных — экран входа, с ними — мессенджер. */
export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(() => loadCredentials());

  if (!creds) {
    return (
      <LoginScreen
        onLogin={(c) => {
          saveCredentials(c);
          setCreds(c);
        }}
      />
    );
  }

  return (
    <MessengerScreen
      key={creds.idInstance}
      creds={creds}
      onLogout={() => {
        clearCredentials();
        setCreds(null);
      }}
    />
  );
}
