import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useStore } from '@/state/store';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  const activeId = useStore((s) => s.activeId);

  // Keep the TV's state fresh while the app is open.
  useEffect(() => {
    if (!activeId) return;
    const s = useStore.getState();
    s.refreshInfo();
    s.refreshApps();
    s.refreshNow();
    let t = setInterval(() => useStore.getState().refreshNow(), 4000);
    const sub = AppState.addEventListener('change', (st) => {
      clearInterval(t);
      if (st === 'active') {
        useStore.getState().refreshInfo();
        useStore.getState().refreshNow();
        t = setInterval(() => useStore.getState().refreshNow(), 4000);
      }
    });
    return () => { clearInterval(t); sub.remove(); };
  }, [activeId]);

  if (!activeId) return <Redirect href="/connect" />;
  return (
    <Tabs
      tabBar={(p) => <TabBar {...p} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' }, animation: 'shift' }}
    >
      <Tabs.Screen name="remote" />
      <Tabs.Screen name="apps" />
      <Tabs.Screen name="assistant" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
