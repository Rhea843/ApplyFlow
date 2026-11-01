CREATE TYPE application_status AS ENUM (
    'Applied',
    'Interview',
    'Rejected',
    'Offer'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    website TEXT,
    location TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, name),
    UNIQUE(id, user_id)
);

CREATE TABLE applications(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID NOT NULL,
    position TEXT NOT NULL,
    location TEXT NOT NULL,
    date_applied DATE NOT NULL,
    status application_status NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id, user_id) REFERENCES companies(id, user_id) ON DELETE CASCADE
);

CREATE TABLE application_status_history(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL,
    status application_status NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);