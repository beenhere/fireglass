package dev.bhawesh.tvhome;

import android.content.ComponentName;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.util.Log;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Watch history across apps: what each app reports as "now playing" (its media session, the same
 * thing Alexa reads). Only a notification listener may read other apps' sessions, so this is one;
 * it ignores notifications. Enabled over adb at install (build-and-install.sh).
 * Something counts as watched after a minute of playing; Catalog.watched() records it.
 */
public class Watching extends NotificationListenerService {
    private static final String TAG = "TvHome";
    private static final long WATCHED_AFTER_MS = 60_000;
    // "S1 E9 Maiden Mother Crone", "S1:E9 …", "Season 1 Episode 9 …"
    private static final Pattern EPISODE = Pattern.compile("^\\s*(S(eason)?\\s*\\d+\\s*[:,.]?\\s*E(p(isode)?)?\\s*\\d+)\\b.*",
            Pattern.CASE_INSENSITIVE);

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<MediaController, MediaController.Callback> watched = new HashMap<>();
    private MediaSessionManager msm;
    private final MediaSessionManager.OnActiveSessionsChangedListener changed = this::track;

    @Override
    public void onListenerConnected() {
        msm = getSystemService(MediaSessionManager.class);
        ComponentName me = new ComponentName(this, Watching.class);
        msm.addOnActiveSessionsChangedListener(changed, me);
        List<MediaController> now = msm.getActiveSessions(me);
        Log.i(TAG, "watch history listening; sessions: " + now.size());
        track(now);
    }

    @Override
    public void onListenerDisconnected() {
        if (msm != null) msm.removeOnActiveSessionsChangedListener(changed);
        untrackAll();
    }

    private void track(List<MediaController> sessions) {
        untrackAll();
        if (sessions == null) return;
        for (MediaController mc : sessions) {
            if (mc.getPackageName().startsWith("com.amazon.alexa") || mc.getPackageName().equals("com.amazon.vizzini")) continue;
            MediaController.Callback cb = new MediaController.Callback() {
                @Override public void onPlaybackStateChanged(PlaybackState s) { consider(mc); }
                @Override public void onMetadataChanged(MediaMetadata m) { consider(mc); }
            };
            mc.registerCallback(cb, handler);
            watched.put(mc, cb);
            consider(mc);
        }
    }

    private void untrackAll() {
        for (Map.Entry<MediaController, MediaController.Callback> e : watched.entrySet()) e.getKey().unregisterCallback(e.getValue());
        watched.clear();
        handler.removeCallbacksAndMessages(null);
    }

    /** While a session plays the same item, count it as watched once it has played a minute. */
    private void consider(MediaController mc) {
        PlaybackState s = mc.getPlaybackState();
        MediaMetadata m = mc.getMetadata();
        handler.removeCallbacksAndMessages(mc);
        if (s == null || s.getState() != PlaybackState.STATE_PLAYING || m == null) return;
        // What each app reports varies; logged so the parsing below can be tuned per app.
        Log.i(TAG, "playing " + mc.getPackageName() + ": " + describe(m));
        String[] item = item(m);
        if (item == null) return;
        handler.postAtTime(() -> {
            PlaybackState now = mc.getPlaybackState();
            MediaMetadata nm = mc.getMetadata();
            String[] still = nm == null ? null : item(nm);
            if (now == null || now.getState() != PlaybackState.STATE_PLAYING || still == null
                    || !still[0].equals(item[0]) || !still[1].equals(item[1])) return;
            String pkg = mc.getPackageName();
            new Thread(() -> Catalog.watched(this, pkg, item[0], item[1]), "watched").start();
        }, mc, android.os.SystemClock.uptimeMillis() + WATCHED_AFTER_MS);
    }

    /**
     * {show or movie, episode or ""} from what the app reports. Apps put the episode in the title
     * and the show in the subtitle/album/artist, or the show alone in the title.
     */
    static String[] item(MediaMetadata m) {
        String title = first(m, MediaMetadata.METADATA_KEY_DISPLAY_TITLE, MediaMetadata.METADATA_KEY_TITLE);
        String show = first(m, MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE, MediaMetadata.METADATA_KEY_ALBUM,
                MediaMetadata.METADATA_KEY_ARTIST, MediaMetadata.METADATA_KEY_ALBUM_ARTIST);
        if (title.isEmpty()) return show.isEmpty() ? null : new String[]{show, ""};
        Matcher e = EPISODE.matcher(title);
        boolean episodic = e.matches() || (!show.isEmpty() && !show.equalsIgnoreCase(title));
        if (episodic && !show.isEmpty()) return new String[]{show, title};
        if (e.matches()) return null; // an episode with no show name: nothing to look up
        return new String[]{title, ""};
    }

    private static String first(MediaMetadata m, String... keys) {
        for (String k : keys) {
            CharSequence v = m.getText(k);
            if (v != null && v.toString().trim().length() > 0) return v.toString().trim();
        }
        return "";
    }

    private static String describe(MediaMetadata m) {
        StringBuilder sb = new StringBuilder();
        for (String k : m.keySet()) {
            CharSequence v = m.getText(k);
            if (v != null) sb.append(k.replace("android.media.metadata.", "")).append('=').append(v).append("; ");
        }
        return sb.toString();
    }
}
