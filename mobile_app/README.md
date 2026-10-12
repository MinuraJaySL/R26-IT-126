# GreenSweep

GreenSweep is the mobile app of the Smart Waste Management System
(final-year research project, group R26-IT-126). It connects residents,
collection-truck drivers and administrators: residents ask for pickups and
follow the truck, drivers get a route through the bins and requests that need
them, and admins manage the accounts.

It is built with Flutter and currently targets **Android**.

## Features

### Resident
- Sign up with an email verification code, then complete a profile (name,
  phone, ward).
- Request a pickup by placing a flag on the map, and follow its status.
- Track the collection truck live on the map.
- Report a problem with a bin and see when a driver resolves it.
- Receive collection announcements and pickup updates as push notifications,
  with an in-app inbox.

### Driver
- **Bin priority map** – smart bins that report as critical, with a suggested
  road route through them.
- **Pickup route** – a road route through the active resident pickup requests;
  residents are notified when the truck is near.
- Live location sharing during a trip, which keeps running with the screen off.
- Announce the next collection for a ward. Residents of that ward are notified
  at 6 PM the evening before.
- Handle missed pickups and resident bin reports, with navigation to each.

### Admin
- Add driver accounts (the driver gets a temporary password by email and must
  change it at first login).
- Enable, disable and edit user accounts, and answer account-recovery requests.
- Review scheduled collection announcements and send one immediately.

## How it is built

| Part | Technology |
| --- | --- |
| App | Flutter (Dart), `provider` for state, `go_router` for navigation |
| Sign-in | Firebase Authentication (email and password) |
| Data | Cloud Firestore |
| Push notifications | Firebase Cloud Messaging |
| Crash reports | Firebase Crashlytics |
| Maps and routes | `flutter_map` with OpenStreetMap tiles, OSRM for road routes |
| Location | `geolocator` (Android foreground service during a trip) |
| Backend | Cloudflare Worker (`cf-worker/`, TypeScript) |
| Email | EmailJS, called from the Worker |

The project uses Firebase's free plan, so there are no Cloud Functions. The
Cloudflare Worker does the jobs that must not run on the phone:

- generates and checks the sign-up verification codes;
- creates driver accounts for admins;
- sends push notifications and writes the inbox records;
- receives fill-level and gas status from the smart-bin devices
  (`POST /bin-status`);
- runs on a schedule to send the evening collection announcements and to
  delete old records every night.

## Project layout

```
lib/
  main.dart          app start-up, theme, push-notification handling
  router/            routes and the login / role / profile gates
  providers/         signed-in user state
  services/          Firestore, auth, location, routing, notifications, admin API
  models/            data classes
  screens/           auth, resident, driver, admin, profile
  widgets/           shared widgets (snackbars and pop-ups, inputs, pickers)
  utils/             distance helpers, user-friendly error messages
  config/            Worker URL, list of wards
cf-worker/           Cloudflare Worker source and settings
firestore.rules      Firestore security rules
firestore.indexes.json  Firestore composite indexes
```

## Running the app

You need the Flutter SDK (Dart 3.11 or newer) and an Android phone or
emulator.

```
flutter pub get
flutter run
```

To build a release APK and install it on a phone connected over USB:

```
flutter build apk --release
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

The app is already pointed at the project's Firebase project
(`lib/firebase_options.dart`) and Worker (`lib/config/verification_api_config.dart`).

## Deploying the backend

Firestore rules and indexes (needs the Firebase CLI, logged in to the project):

```
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Cloudflare Worker (needs a Cloudflare account):

```
cd cf-worker
npm install
npx wrangler deploy
```

The Worker reads three secrets, which are set once with
`npx wrangler secret put <NAME>` and are never stored in the repository:

| Secret | Purpose |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | lets the Worker read and write Firestore and send pushes |
| `EMAILJS_PRIVATE_KEY` | lets the Worker send emails |
| `BIN_DEVICE_SECRET` | shared secret the smart-bin devices send with each report |

The remaining, non-secret settings are in `cf-worker/wrangler.toml`.

## Accounts and roles

- **Residents** register themselves in the app.
- **Drivers** are created by an admin from the app.
- **The first admin** is created by hand: add the user in Firebase
  Authentication, then create a document in the `users` collection with that
  user's ID and `role: "admin"`.
