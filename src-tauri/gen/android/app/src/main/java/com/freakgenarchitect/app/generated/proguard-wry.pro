# THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!!

# Copyright 2020-2023 Tauri Programme within The Commons Conservancy
# SPDX-License-Identifier: Apache-2.0
# SPDX-License-Identifier: MIT

-keep class com.freakgenarchitect.app.* {
  native <methods>;
}

-keep class com.freakgenarchitect.app.WryActivity {
  public <init>(...);

  void setWebView(com.freakgenarchitect.app.RustWebView);
  java.lang.Class getAppClass(...);
  java.lang.String getVersion();
}

-keep class com.freakgenarchitect.app.Ipc {
  public <init>(...);

  @android.webkit.JavascriptInterface public <methods>;
}

-keep class com.freakgenarchitect.app.RustWebView {
  public <init>(...);

  void loadUrlMainThread(...);
  void loadHTMLMainThread(...);
  void evalScript(...);
}

-keep class com.freakgenarchitect.app.RustWebChromeClient,com.freakgenarchitect.app.RustWebViewClient {
  public <init>(...);
}
