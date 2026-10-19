package dev.bhawesh.tvhome;

import android.accessibilityservice.AccessibilityService;
import android.app.ActivityManager;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.drawable.GradientDrawable;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.content.Context;

/**
 * Fire OS won't let a third-party app be Home (com.amazon.tv.launcher is a protected package), and
 * it consumes KEYCODE_HOME before accessibility key filtering sees it. So this service watches for
 * the Amazon launcher's window and bounces back here. Android holds that bounce for ~5 s after a
 * Home press (app-switch guard), so meanwhile a loading screen (Look.loading) covers the Amazon one.
 */
public class HomeService extends AccessibilityService {
    static final String TAG = "TvHome";
    static final String AMAZON_HOME = "com.amazon.tv.launcher";
    static final String FIRE_SETTINGS = "com.amazon.tv.settings.v2";
    // Shown only on the Settings tab of Amazon's home.
    static final String SETTINGS_TAB_MARKER = "Search Your Settings";
    private static HomeService self;

    private final Handler handler = new Handler();
    private final Runnable hide = this::removeMask;
    private View mask, pinView;
    private RemoteServer remote;
    private final Runnable pinTimeout = this::hidePin;
    private String front = "";          // package of the window in front
    private boolean settingsMode;       // user is in Amazon's Settings tab on purpose
    private long settingsSince;
    private final Runnable settingsWatch = this::checkSettings;

    @Override
    protected void onServiceConnected() {
        self = this;
        remote = new RemoteServer(this);
        remote.start();
    }

    @Override
    public boolean onUnbind(Intent i) {
        self = null;
        removeMask();
        hidePin();
        if (remote != null) remote.stop();
        return super.onUnbind(i);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent e) {
        if (e.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || e.getPackageName() == null) return;
        String pkg = e.getPackageName().toString();
        // Popups and toasts from the system don't count as what's in front.
        if (pkg.equals("android") || pkg.equals("com.android.systemui")) return;
        front = pkg;
        if (settingsMode) {
            // Amazon settings and its sub-screens are fine; anything else ends the visit.
            if (pkg.equals(AMAZON_HOME) || pkg.equals(FIRE_SETTINGS)) return;
            endSettings();
        }
        if (!pkg.equals(AMAZON_HOME)) return;
        // Only its home screen; its other screens (app library, search) open normally.
        CharSequence cls = e.getClassName();
        if (cls == null || !cls.toString().contains("HomeActivity")) return;
        Log.i(TAG, "amazon home surfaced: " + cls);
        bounce();
    }

    /**
     * Display & sounds, Preferences, Accessibility and Account exist only as the Settings tab of
     * Amazon's home (their screens need Amazon's signature permission, even from adb shell).
     * Open that tab and stand aside; navigating inside Amazon's home sends no window events, so
     * poll for the tab's marker and come back home once it's gone (Back or Home pressed).
     */
    static boolean openAmazonSettings(Context c) {
        if (self == null) return false;
        self.settingsMode = true;
        self.settingsSince = android.os.SystemClock.uptimeMillis();
        self.handler.removeCallbacks(self.settingsWatch);
        self.handler.postDelayed(self.settingsWatch, 2500);
        c.startActivity(new Intent().setClassName(AMAZON_HOME, AMAZON_HOME + ".ui.SettingsActivity")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        return true;
    }

    private void checkSettings() {
        if (!settingsMode) return;
        if (front.equals(AMAZON_HOME)) {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            boolean onTab = root != null && !root.findAccessibilityNodeInfosByText(SETTINGS_TAB_MARKER).isEmpty();
            if (root != null) root.recycle();
            if (!onTab) {
                Log.i(TAG, "left amazon settings");
                endSettings();
                bounce();
                return;
            }
        }
        handler.postDelayed(settingsWatch, 800);
    }

    private void endSettings() {
        settingsMode = false;
        handler.removeCallbacks(settingsWatch);
    }

    private void bounce() {
        showMask();
        startActivity(new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
        // The Amazon launcher holds ~130 MB; reclaim it once it's behind us (after the 5 s guard).
        ActivityManager am = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
        handler.postDelayed(() -> am.killBackgroundProcesses(AMAZON_HOME), 8000);
    }

    static boolean maskShowing() {
        return self != null && self.mask != null;
    }

    /** Called by MainActivity once it is drawn again. */
    static void hideMask() {
        if (self != null) self.removeMask();
    }

    private void showMask() {
        if (mask != null) return;
        View v = Look.loading(this, MainActivity.dockCount, MainActivity.accent);
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(-1, -1,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_FULLSCREEN,
                PixelFormat.OPAQUE);
        try {
            getSystemService(WindowManager.class).addView(v, lp);
        } catch (RuntimeException ex) {
            Log.w(TAG, "mask failed", ex);
            return;
        }
        mask = v;
        // Never strand the remote behind the loading screen if the bounce fails.
        handler.postDelayed(hide, 8000);
    }

    private void removeMask() {
        handler.removeCallbacks(hide);
        View m = mask;
        if (m == null) return;
        mask = null;
        m.animate().alpha(0).setDuration(180)
                .withEndAction(() -> getSystemService(WindowManager.class).removeViewImmediate(m));
    }

    /** Package of the app in front, for the phone's "now playing". */
    String front() { return front; }

    /** Home from the phone: straight to this launcher (no Home key, so no 5 s app-switch hold). */
    void goHome() {
        startActivity(new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
    }

    /** Pairing code, top right over whatever is on screen, for two minutes. */
    void showPin(String pin, String device) {
        hidePin();
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        int pad = Look.dp(this, 26);
        card.setPadding(pad, Look.dp(this, 22), pad, Look.dp(this, 24));
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(Look.dp(this, 28));
        bg.setColor(0xEB121420);
        bg.setStroke(Look.dp(this, 1), 0x33FFFFFF);
        card.setBackground(bg);
        TextView head = Look.text(this, Look.sans(this, 600), 16, 0xE6FFFFFF);
        head.setText("Pair " + device);
        TextView code = Look.text(this, Look.serif(this), 72, 0xFFFFFFFF);
        code.setText(pin);
        code.setLetterSpacing(0.18f);
        TextView hint = Look.text(this, Look.sans(this, 500), 14, 0x99FFFFFF);
        hint.setText("Type this code on your phone");
        hint.setSingleLine(true);
        card.addView(head);
        LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-2, -2);
        cp.setMargins(0, Look.dp(this, 10), 0, Look.dp(this, 8));
        card.addView(code, cp);
        card.addView(hint);
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(-2, -2,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.END;
        lp.x = Look.dp(this, 48);
        lp.y = Look.dp(this, 40);
        try {
            getSystemService(WindowManager.class).addView(card, lp);
        } catch (RuntimeException e) {
            Log.w(TAG, "pin overlay failed", e);
            return;
        }
        pinView = card;
        card.setAlpha(0f);
        card.setTranslationY(-Look.dp(this, 12));
        card.animate().alpha(1f).translationY(0f).setDuration(Look.ms(this, 260)).start();
        handler.postDelayed(pinTimeout, 120_000);
    }

    void hidePin() {
        handler.removeCallbacks(pinTimeout);
        View v = pinView;
        if (v == null) return;
        pinView = null;
        v.animate().alpha(0f).setDuration(Look.ms(this, 180))
                .withEndAction(() -> getSystemService(WindowManager.class).removeViewImmediate(v)).start();
    }

    @Override
    public void onInterrupt() { }
}
