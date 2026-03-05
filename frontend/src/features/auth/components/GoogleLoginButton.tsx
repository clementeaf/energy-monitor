import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../../hooks/auth/useAuth';

export function GoogleLoginButton() {
  const { loginGoogle } = useAuth();

  return (
    <GoogleLogin
      onSuccess={(response) => {
        if (response.credential) {
          loginGoogle(response.credential);
        }
      }}
      onError={() => {
        // Error handled by Google's own UI
      }}
      theme="filled_black"
      size="large"
      width="400"
      text="continue_with"
    />
  );
}
