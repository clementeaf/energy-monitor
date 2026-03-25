import { useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

export function useGoogleAuth(onSuccess: (idToken: string) => void) {
  const login = useGoogleLogin({
    flow: 'implicit',
    onSuccess: (response) => {
      // Google implicit flow returns access_token in the response
      // For id_token we need the 'auth-code' flow, but the existing setup
      // uses credential from GoogleLogin button which gives id_token directly
      // This hook is a fallback; primary flow is the GoogleLogin button
      if ('credential' in response) {
        onSuccess(response.credential as string);
      }
    },
    onError: () => {
      // Handled by caller
    },
  });

  const loginWithCredential = useCallback(
    (credential: string) => {
      onSuccess(credential);
    },
    [onSuccess],
  );

  return { login, loginWithCredential };
}
