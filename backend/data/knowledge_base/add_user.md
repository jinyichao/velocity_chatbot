intent: add_user

# Adding a User

## Steps to add a user
Go to Administration > User Management > Add User. Enter the user's NRIC/FIN, name, and email. Assign a role and set transaction limits. Requires Super Admin or Admin rights.

## User roles
- **Super Admin**: Full access including user management and settings.
- **Admin**: Can manage users but cannot change Super Admin settings.
- **Authoriser (Checker)**: Can approve transactions but cannot initiate.
- **Maker**: Can initiate transactions but requires Checker approval.
- **Viewer**: Read-only access to accounts and reports.

## Editing user permissions
Go to Administration > User Management > select user > Edit. Permissions, limits, and accessible accounts can be modified.

## Token (Digital Security Token)
New users must activate their Digital Security Token (DST) via the OCBC Business app before they can log in to Velocity.

## Maker-Checker requirement
All user additions and permission changes require a second Admin to approve (Maker-Checker) for security.

## Audit trail
All user addition actions are logged under Administration > Audit Trail.
