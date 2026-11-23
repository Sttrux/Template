BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS role_audit_logs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('assigned', 'revoked')),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(255) NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expire_idx ON sessions (expire);
CREATE INDEX IF NOT EXISTS posts_published_created_idx ON posts (published, created_at);
CREATE INDEX IF NOT EXISTS role_audit_target_changed_idx ON role_audit_logs (target_user_id, changed_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS posts_set_updated_at ON posts;
CREATE TRIGGER posts_set_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION audit_user_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    actor_id INTEGER;
BEGIN
    actor_id := NULLIF(current_setting('app.actor_user_id', true), '')::INTEGER;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO role_audit_logs (actor_user_id, target_user_id, role_id, action)
        VALUES (actor_id, NEW.user_id, NEW.role_id, 'assigned');
        RETURN NEW;
    END IF;

    INSERT INTO role_audit_logs (actor_user_id, target_user_id, role_id, action)
    VALUES (actor_id, OLD.user_id, OLD.role_id, 'revoked');
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_audit_insert ON user_roles;
CREATE TRIGGER user_roles_audit_insert
AFTER INSERT ON user_roles
FOR EACH ROW EXECUTE FUNCTION audit_user_role_change();

DROP TRIGGER IF EXISTS user_roles_audit_delete ON user_roles;
CREATE TRIGGER user_roles_audit_delete
AFTER DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION audit_user_role_change();

INSERT INTO roles (name, description) VALUES
    ('admin', 'Full access, including user and role management'),
    ('moderator', 'Manage example content but not users or roles'),
    ('user', 'Read public content and manage owned resources')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
    ('users:read', 'Read user accounts'),
    ('roles:manage', 'Assign and revoke roles'),
    ('posts:read', 'Read public posts'),
    ('posts:create', 'Create posts'),
    ('posts:publish', 'Publish posts'),
    ('posts:update:any', 'Update any post'),
    ('posts:update:own', 'Update owned posts'),
    ('posts:delete:any', 'Delete any post'),
    ('posts:delete:own', 'Delete owned posts')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.name IN (
    'posts:read', 'posts:create', 'posts:publish', 'posts:update:any', 'posts:delete:any'
)
WHERE roles.name = 'moderator'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.name IN (
    'posts:read', 'posts:create', 'posts:update:own', 'posts:delete:own'
)
WHERE roles.name = 'user'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE PROCEDURE create_user_with_default_role(
    IN p_username VARCHAR,
    IN p_email VARCHAR,
    IN p_password_hash TEXT,
    OUT p_user_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    default_role_id INTEGER;
BEGIN
    SELECT id INTO default_role_id FROM roles WHERE name = 'user';
    IF default_role_id IS NULL THEN
        RAISE EXCEPTION 'Default user role is missing';
    END IF;

    INSERT INTO users (username, email, password_hash)
    VALUES (lower(p_username), lower(p_email), p_password_hash)
    RETURNING id INTO p_user_id;

    INSERT INTO user_roles (user_id, role_id)
    VALUES (p_user_id, default_role_id);
END;
$$;

CREATE OR REPLACE PROCEDURE set_user_role(
    IN p_actor_user_id INTEGER,
    IN p_target_user_id INTEGER,
    IN p_role_name VARCHAR,
    IN p_assign BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    selected_role_id INTEGER;
    admin_role_id INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' FOR UPDATE;
    IF admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Admin role is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = p_actor_user_id AND p.name = 'roles:manage'
    ) THEN
        RAISE EXCEPTION 'Actor lacks role-management permission'
            USING ERRCODE = '42501';
    END IF;

    SELECT id INTO selected_role_id FROM roles WHERE name = p_role_name;
    IF selected_role_id IS NULL THEN
        RAISE EXCEPTION 'Unknown role: %', p_role_name USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_target_user_id) THEN
        RAISE EXCEPTION 'Target user does not exist' USING ERRCODE = 'P0002';
    END IF;

    PERFORM set_config('app.actor_user_id', p_actor_user_id::TEXT, true);

    IF p_assign THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (p_target_user_id, selected_role_id)
        ON CONFLICT DO NOTHING;
    ELSE
        IF selected_role_id = admin_role_id THEN
            SELECT COUNT(*) INTO admin_count
            FROM user_roles WHERE role_id = admin_role_id;
            IF admin_count <= 1 THEN
                RAISE EXCEPTION 'Cannot revoke the last admin role'
                    USING ERRCODE = '23514';
            END IF;
        END IF;

        DELETE FROM user_roles
        WHERE user_id = p_target_user_id AND role_id = selected_role_id;
    END IF;
END;
$$;

REVOKE ALL ON PROCEDURE create_user_with_default_role(VARCHAR, VARCHAR, TEXT) FROM PUBLIC;
REVOKE ALL ON PROCEDURE set_user_role(INTEGER, INTEGER, VARCHAR, BOOLEAN) FROM PUBLIC;

COMMIT;
