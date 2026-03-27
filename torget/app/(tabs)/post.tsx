import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { usePostDraftStore } from '../../store/post';

export default function PostScreen() {
  const router = useRouter();
  const reset = usePostDraftStore((s) => s.reset);

  useEffect(() => {
    reset();
    router.replace('/post/images');
  }, [reset, router]);

  return null;
}
