# CI Secrets Setup Guide

This guide explains every GitHub Actions repository secret required to sign and ship the Yapide app. Without these secrets, the Android and iOS build jobs will fail at the signing step.

Add each secret at:
**GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret**

---

## Android Secrets

The Android workflow (`build-android.yml`) signs the release AAB with a Java keystore.

### Required Secrets

| Secret name | Format | Description |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64 string | The `.jks` keystore file encoded as base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Plain text | Password used when the keystore was created |
| `ANDROID_KEY_ALIAS` | Plain text | Alias of the signing key inside the keystore |
| `ANDROID_KEY_PASSWORD` | Plain text | Password for that specific key (may equal the keystore password) |

### Step-by-step: Generate the Android keystore

1. **Generate a new keystore** (skip if you already have one from a previous release):

   ```bash
   keytool -genkey -v \
     -keystore release.jks \
     -alias yapide \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000
   ```

   Answer the prompts (name, organisation, country, etc.). Note the keystore password and key password you choose — you will need them in the next step.

2. **Verify the keystore**:

   ```bash
   keytool -list -v -keystore release.jks
   ```

   Confirm the alias name matches what you used (`yapide` in the example above).

3. **Encode the keystore as base64**:

   ```bash
   # macOS / Linux
   base64 -i release.jks | tr -d '\n'
   ```

   Copy the entire output (one long string, no line breaks).

4. **Add the secrets to GitHub**:

   | Secret name | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | The base64 string from step 3 |
   | `ANDROID_KEYSTORE_PASSWORD` | The keystore password you chose |
   | `ANDROID_KEY_ALIAS` | The alias you chose (`yapide`) |
   | `ANDROID_KEY_PASSWORD` | The key password you chose |

5. **Store the keystore file safely** — keep `release.jks` and the passwords in a password manager. If you lose the keystore you cannot publish updates to an existing app on Google Play.

---

## iOS Secrets

The iOS workflow (`build-ios.yml`) installs an Apple Distribution certificate and provisioning profile into a temporary keychain before building the IPA.

### Required Secrets

| Secret name | Format | Description |
|---|---|---|
| `IOS_BUILD_CERTIFICATE_BASE64` | Base64 string | The `.p12` distribution certificate exported from Keychain Access |
| `IOS_P12_PASSWORD` | Plain text | The password set when exporting the `.p12` |
| `IOS_PROVISION_PROFILE_BASE64` | Base64 string | The `.mobileprovision` distribution profile |
| `IOS_KEYCHAIN_PASSWORD` | Plain text | Any strong random password — used only for the temporary CI keychain |
| `IOS_EXPORT_OPTIONS_PLIST` | Base64 string | A `ExportOptions.plist` file encoded as base64 |

### Step-by-step: Export the distribution certificate (p12)

1. On your Mac, open **Xcode → Settings → Accounts**, select your Apple ID, and click **Manage Certificates**.
2. If no distribution certificate exists, click **+** and choose **Apple Distribution**.
3. Open **Keychain Access**, find the certificate named **Apple Distribution: Your Name (TEAMID)** under **My Certificates**.
4. Right-click the certificate (expand the triangle first so both the certificate and private key are selected together), then choose **Export 2 items…**.
5. Save as `distribution.p12`, set a strong export password, and click **OK**.
6. Encode it as base64:

   ```bash
   base64 -i distribution.p12 | tr -d '\n'
   ```

   Copy the output.

7. Add to GitHub:

   | Secret name | Value |
   |---|---|
   | `IOS_BUILD_CERTIFICATE_BASE64` | Base64 string from step 6 |
   | `IOS_P12_PASSWORD` | The export password from step 5 |

> **Set a calendar reminder for expiry.**
> Apple Distribution certificates are valid for **one year**. The day you create the certificate, open your calendar app and add a reminder for **11 months from now** (or earlier) with the note "Renew iOS Distribution Certificate". If the certificate expires silently, iOS builds will fail with a cryptic signing error until the certificate is regenerated and the secret is rotated.
>
> The `check-ios-cert-expiry` GitHub Actions workflow (`.github/workflows/check-ios-cert-expiry.yml`) runs every Monday and will open a GitHub issue automatically when fewer than 30 days remain, but the calendar reminder is an important safety net for teams that do not watch CI notifications closely.

### Step-by-step: Download the provisioning profile

1. Go to [developer.apple.com](https://developer.apple.com) → **Certificates, IDs & Profiles → Profiles**.
2. Create (or download) an **App Store Distribution** provisioning profile for the Yapide app bundle ID.
3. Download the `.mobileprovision` file.
4. Encode it as base64:

   ```bash
   base64 -i YapideDistribution.mobileprovision | tr -d '\n'
   ```

5. Add to GitHub:

   | Secret name | Value |
   |---|---|
   | `IOS_PROVISION_PROFILE_BASE64` | Base64 string from step 4 |

### Step-by-step: Create the ExportOptions.plist

1. Create a file named `ExportOptions.plist` with contents similar to:

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
     "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>method</key>
     <string>app-store</string>
     <key>teamID</key>
     <string>YOUR_TEAM_ID</string>
     <key>uploadBitcode</key>
     <false/>
     <key>uploadSymbols</key>
     <true/>
     <key>signingStyle</key>
     <string>manual</string>
     <key>provisioningProfiles</key>
     <dict>
       <key>com.yourcompany.yapide</key>
       <string>YapideDistribution</string>
     </dict>
   </dict>
   </plist>
   ```

   Replace `YOUR_TEAM_ID`, `com.yourcompany.yapide`, and `YapideDistribution` with your actual values.

2. Encode the file as base64:

   ```bash
   base64 -i ExportOptions.plist | tr -d '\n'
   ```

3. Add to GitHub:

   | Secret name | Value |
   |---|---|
   | `IOS_EXPORT_OPTIONS_PLIST` | Base64 string from step 2 |

### Set the keychain password

Generate any strong random password (e.g. `openssl rand -base64 24`) and store it as:

| Secret name | Value |
|---|---|
| `IOS_KEYCHAIN_PASSWORD` | Your random password |

This password is used only for the temporary keychain that exists during the CI job — it does not need to match anything in Apple's systems.

---

## Quick reference: All secrets at a glance

| Secret name | Workflow | Format |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Android | Base64-encoded `.jks` file |
| `ANDROID_KEYSTORE_PASSWORD` | Android | Plain text password |
| `ANDROID_KEY_ALIAS` | Android | Plain text alias name |
| `ANDROID_KEY_PASSWORD` | Android | Plain text password |
| `IOS_BUILD_CERTIFICATE_BASE64` | iOS | Base64-encoded `.p12` file |
| `IOS_P12_PASSWORD` | iOS | Plain text password |
| `IOS_PROVISION_PROFILE_BASE64` | iOS | Base64-encoded `.mobileprovision` file |
| `IOS_KEYCHAIN_PASSWORD` | iOS | Plain text password (any strong value) |
| `IOS_EXPORT_OPTIONS_PLIST` | iOS | Base64-encoded `ExportOptions.plist` file |
