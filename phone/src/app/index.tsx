import { Redirect } from 'expo-router';
import { useStore } from '@/state/store';

export default function Index() {
  const active = useStore((s) => s.activeId);
  return <Redirect href={active ? '/remote' : '/connect'} />;
}
