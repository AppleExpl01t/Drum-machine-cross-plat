import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 36
    namespace = "com.geministudio.app"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.geministudio.app"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    signingConfigs {
        create("release") {
            val keystoreFile = file("key.properties")
            if (keystoreFile.exists()) {
                val properties = Properties()
                properties.load(keystoreFile.inputStream())
                keyAlias = properties.getProperty("keyAlias")
                keyPassword = properties.getProperty("keyPassword")
                storeFile = file(properties.getProperty("storeFile"))
                storePassword = properties.getProperty("storePassword")
            } else {
                println("Signing config not found: key.properties is missing")
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {
                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            isMinifyEnabled = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = "tauri.build.gradle.kts")

tasks.register("generateReleaseKeystore") {
    doLast {
        val keystoreFile = file("release.keystore")
        val propsFile = file("key.properties")
        
        if (!keystoreFile.exists()) {
            println("Generating release.keystore...")
            val javaHome = System.getProperty("java.home")
            val keytool = if (System.getProperty("os.name").lowercase().contains("win")) {
                "$javaHome/bin/keytool.exe"
            } else {
                "$javaHome/bin/keytool"
            }
            
            exec {
                commandLine(keytool, "-genkey", "-v", "-keystore", keystoreFile.absolutePath, "-alias", "release", "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-storepass", "password", "-keypass", "password", "-dname", "CN=Android Debug,O=Android,C=US")
            }
            println("Keystore generated at ${keystoreFile.absolutePath}")
            
            val propsContent = """
                storePassword=password
                keyPassword=password
                keyAlias=release
                storeFile=release.keystore
            """.trimIndent()
            
            propsFile.writeText(propsContent)
            println("key.properties generated at ${propsFile.absolutePath}")
        } else {
            println("Keystore already exists.")
        }
    }
}