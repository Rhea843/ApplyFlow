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
    name TEXT NOT NULL UNIQUE,
    website TEXT,
    location TEXT
);

CREATE TABLE applications(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL,
    companyId UUID NOT NULL,
    position TEXT NOT NULL,
    location TEXT NOT NULL,
    dateApplied DATE NOT NULL,
    status application_status NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (companyId) REFERENCES companies(id)
);