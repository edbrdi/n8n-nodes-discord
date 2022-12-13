# Changelog

## Released (2022-12-13 0.4.1)

### New Features

- Trigger: Attachments field

## Released (2022-11-27 0.4.0)

### New Features

- Trigger: Interaction
- Send: Persistent button/select

## Released (2022-11-26 0.3.1)

### Bug fixes

- User mention notifications are now sent

## Released (2022-11-25 0.3.0)

### New Features

- Trigger: User joins the server
- Trigger: User leaves the server
- Trigger: User presence update
- Trigger: User role added
- Trigger: User role removed
- Action : Add role to user
- Action : Remove role from user

### Bug fixes

- Bot crash when a non-administrator try to use bot "/" commands

## Released (2022-11-06 0.2.0)

### New Features

- base64 on embeds & files
- more context returned by executed nodes (trigger/send)
- type "Action" added on the Discord Send node, with one action possible at the moment: "Remove messages"
- bot customization (activity, activity type, status)

### Improvements/refactoring

- You can now send embeds without "content"

### Bug Fixes

- Error when using prompt if no placeholderId

## Released (2022-10-26 0.1.3)

### Bug Fixes

- Fix subdomain regex

## Released (2022-10-26 0.1.2)

### Improvements/refactoring

- prevent bot crashes

### Bug Fixes

- fix baseUrl
- fix placeholder animation

## Released (2022-10-26 0.1.1)

### Improvements/refactoring

- Added base url field to Discord credentials, so there is no need to use env var and have conflict with different formats
