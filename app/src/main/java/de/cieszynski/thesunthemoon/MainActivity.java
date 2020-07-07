package de.cieszynski.thesunthemoon;

import android.Manifest;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import java.util.List;

public class MainActivity extends AppCompatActivity {

    private static final int REQUEST_ACCESS_FINE_LOCATION = 867;
    private WebViewAssetLoader mAssetLoader;
    private WebView mWebView;
    private GeolocationPermissions.Callback mGeolocationPermissionsCallback = null;
    private String mGeoLocationRequestOrigin = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // PackageInfo webViewPackageInfo = WebViewCompat.getCurrentWebViewPackage(this);
        // double ver = (webViewPackageInfo == null) ? 0.0 : webViewPackageInfo.versionCode;
        // 404413800    // 81.04044.138
        // 410301410; //83.0.4103.14
        mWebView = new WebView(this);
        mWebView.setVerticalScrollBarEnabled(false);
        mWebView.setBackgroundColor(Color.TRANSPARENT);
        mWebView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
        // prevent crash on long clicks
        mWebView.setLongClickable(false);
        mWebView.setHapticFeedbackEnabled(false);
        mWebView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true;
            }
        });
        // mWebView.addJavascriptInterface(this, "android");
        WebSettings webSettings = mWebView.getSettings();
        webSettings.setUseWideViewPort(true);
        //webSettings.setDomStorageEnabled(true);
        //webSettings.setDatabaseEnabled(true);
        webSettings.setJavaScriptEnabled(true);

/*        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK_STRATEGY)) {
            // https://stackoverflow.com/a/61643614
            WebSettingsCompat.setForceDarkStrategy(webSettings, WebSettingsCompat.DARK_STRATEGY_WEB_THEME_DARKENING_ONLY);
        }*/

        mWebView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                Log.d("XXX", "onPageStarted");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d("XXX", "onPageFinished");
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                                                              WebResourceRequest request) {
                String filename = request.getUrl().getLastPathSegment();
                if (filename.endsWith(".ico")) {
                    return new WebResourceResponse("image/png", null, null);
                }
                WebResourceResponse intercepted = mAssetLoader.shouldInterceptRequest(request.getUrl());
                return intercepted;
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                        != PackageManager.PERMISSION_GRANTED) {
                    mGeolocationPermissionsCallback = callback;
                    mGeoLocationRequestOrigin = origin;
                    ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, REQUEST_ACCESS_FINE_LOCATION);
                } else {
                    callback.invoke(origin, true, true);
                }
            }
        });

        mAssetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        if (savedInstanceState != null) {
            mWebView.restoreState(savedInstanceState);
        } else {
            Uri path = new Uri.Builder()
                    .scheme("https")
                    .authority(WebViewAssetLoader.DEFAULT_DOMAIN)
                    .appendPath("index.html")
                    .build();
            mWebView.loadUrl(path.toString());
        }

        setContentView(mWebView);
    }

    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        switch (requestCode) {
            case REQUEST_ACCESS_FINE_LOCATION: {
                if (mGeolocationPermissionsCallback != null) {
                    mGeolocationPermissionsCallback.invoke(
                            mGeoLocationRequestOrigin,
                            (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED),
                            (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED));
                }
                return;
            }
            // other 'case' lines to check for other
            // permissions this app might request
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        mWebView.saveState(outState);
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        mWebView.restoreState(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        if (mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(this, toast, Toast.LENGTH_SHORT).show();
    }

    @JavascriptInterface
    public void openGooglePlayStore() {
        // https://stackoverflow.com/a/28090925
        Intent rateIntent = new Intent(Intent.ACTION_VIEW,
                Uri.parse("market://details?id=com.google.android.webview"));
        boolean marketFound = false;

        final List<ResolveInfo> otherApps = getPackageManager()
                .queryIntentActivities(rateIntent, 0);

        for (ResolveInfo otherApp : otherApps) {
            ActivityInfo otherAppActivity = otherApp.activityInfo;
            ComponentName componentName = new ComponentName(
                    otherAppActivity.applicationInfo.packageName,
                    otherAppActivity.name
            );
            // make sure it does NOT open in the stack of your activity
            rateIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            // task reparenting if needed
            rateIntent.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            // if the Google Play was already open in a search result
            //  this make sure it still go to the app page you requested
            rateIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            // this make sure only the Google Play app is allowed to
            // intercept the intent
            rateIntent.setComponent(componentName);
            startActivity(rateIntent);
            marketFound = true;
            break;
        }

        // if GP not present on device, open web browser
        if (!marketFound) {
            Intent webIntent = new Intent(Intent.ACTION_VIEW,
                    Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview"));
            startActivity(webIntent);
        }

        finishAndRemoveTask();
    }
}