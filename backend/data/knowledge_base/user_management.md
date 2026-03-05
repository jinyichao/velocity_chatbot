intent: user_management

# User Management

## Adding a user
Go to Administration > User Management > Add User. Enter the user's NRIC/FIN, name, and email. Assign a role and set transaction limits. Requires Super Admin or Admin rights.

## User roles
- **Super Admin**: Full access including user management and settings.
- **Admin**: Can manage users but cannot change Super Admin settings.
- **Authoriser (Checker)**: Can approve transactions but cannot initiate.
- **Maker**: Can initiate transactions but requires Checker approval.
- **Viewer**: Read-only access to accounts and reports.

## Editing user permissions
Go to Administration > User Management > select user > Edit. Permissions, limits, and accessible accounts can be modified.

## Deactivating a user
Select the user and click Deactivate. The user immediately loses login access. Reactivation requires Admin action.

## Token (Digital Security Token)
New users must activate their Digital Security Token (DST) via the OCBC Business app before they can log in to Velocity.

## Maker-Checker requirement
All user additions and permission changes require a second Admin to approve (Maker-Checker) for security.

## Audit trail for user changes
All user management actions are logged and accessible under Administration > Audit Trail.
