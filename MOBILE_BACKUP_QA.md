# Mobile Backup QA

Use this checklist when validating mobile import/export in Expo Go, simulator, or a built app.

## Test Files

Sample backups are included in [public/sample-backups/phd-applications-sample.json](/C:/Users/harsh/Documents/New%20project/repo_analysis/public/sample-backups/phd-applications-sample.json) and [public/sample-backups/phd-applications-sample.csv](/C:/Users/harsh/Documents/New%20project/repo_analysis/public/sample-backups/phd-applications-sample.csv).

## Guest Mode

1. Launch the mobile app and continue as Guest.
2. Add one manual application in the app so there is existing local data.
3. Open `More` on the home screen.
4. Tap `Export Backup`.
5. Confirm the platform share sheet appears and the generated file name looks like `phd-applications-YYYY-MM-DD.json`.
6. Tap `Import Backup`.
7. Choose the sample JSON backup.
8. Confirm the import dialog shows the expected application count.
9. Complete the import.
10. Verify imported applications appear in the home list and keep sensible status/deadline formatting.
11. Repeat with the sample CSV backup.

## Signed-In Cloud Mode

1. Sign in with a non-guest account.
2. Confirm the home list loads cloud data.
3. Open `More`.
4. Import the sample JSON backup.
5. Confirm the dialog says the import target is your cloud account.
6. Complete the import.
7. Verify imported applications appear after the Firestore subscription refresh.
8. Export a backup and confirm the share sheet still appears.

## Negative Cases

1. Try importing a file with the wrong extension.
   Expected: an unsupported file alert.
2. Try importing a JSON file containing an object instead of an array.
   Expected: a no-valid-data or import-failed path, not a crash.
3. Cancel file selection from the document picker.
   Expected: no state change and no error alert.
4. Cancel the import confirmation dialog.
   Expected: no state change.

## Notes

- Raw Node imports are not a valid way to verify Expo modules like document picker, file system, or sharing.
- The meaningful validation for this feature is manual runtime testing in Expo or a built mobile app.
- Record the outcome in [MOBILE_BACKUP_QA_REPORT_TEMPLATE.md](/C:/Users/harsh/Documents/New%20project/repo_analysis/MOBILE_BACKUP_QA_REPORT_TEMPLATE.md) so device findings stay reusable.
