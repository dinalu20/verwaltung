CREATE TABLE app_user (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    role            VARCHAR(50)  NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE member (
    id              BIGSERIAL PRIMARY KEY,
    external_id     VARCHAR(50) UNIQUE,
    last_name       VARCHAR(200) NOT NULL,
    first_name      VARCHAR(200) NOT NULL,
    company         VARCHAR(200),
    street          VARCHAR(300),
    zip_code        VARCHAR(10),
    city            VARCHAR(200),
    phone_private   VARCHAR(50),
    phone_mobile    VARCHAR(50),
    payment_note    VARCHAR(500),
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by      BIGINT REFERENCES app_user(id),
    updated_by      BIGINT REFERENCES app_user(id)
);

CREATE TABLE receipt (
    id              BIGSERIAL PRIMARY KEY,
    receipt_number  VARCHAR(50) NOT NULL UNIQUE,
    member_id       BIGINT REFERENCES member(id),
    amount          NUMERIC(12,2) NOT NULL,
    receipt_date    DATE NOT NULL,
    payment_type    VARCHAR(20) NOT NULL,
    purpose         VARCHAR(50) NOT NULL,
    purpose_text    VARCHAR(500),
    printed         BOOLEAN NOT NULL DEFAULT FALSE,
    pdf_data        BYTEA,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      BIGINT REFERENCES app_user(id)
);

CREATE TABLE cash_book (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    book_type       VARCHAR(30) NOT NULL,
    period_month    INTEGER,
    period_year     INTEGER NOT NULL,
    opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      BIGINT REFERENCES app_user(id)
);

CREATE TABLE cash_book_entry (
    id              BIGSERIAL PRIMARY KEY,
    cash_book_id    BIGINT NOT NULL REFERENCES cash_book(id),
    entry_date      DATE NOT NULL,
    receipt_number  VARCHAR(50),
    description     VARCHAR(500) NOT NULL,
    amount_in       NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_out      NUMERIC(12,2) NOT NULL DEFAULT 0,
    account         VARCHAR(200),
    recipient       VARCHAR(200),
    approved_by     VARCHAR(200),
    payment_id      BIGINT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by      BIGINT REFERENCES app_user(id)
);

CREATE TABLE payment (
    id                  BIGSERIAL PRIMARY KEY,
    member_id           BIGINT REFERENCES member(id),
    amount              NUMERIC(12,2) NOT NULL,
    payment_date        DATE NOT NULL,
    payment_type        VARCHAR(20) NOT NULL,
    purpose             VARCHAR(50) NOT NULL,
    purpose_text        VARCHAR(500),
    for_year            INTEGER,
    receipt_id          BIGINT REFERENCES receipt(id),
    bank_import_line_id BIGINT,
    cash_book_entry_id  BIGINT REFERENCES cash_book_entry(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by          BIGINT REFERENCES app_user(id)
);

CREATE TABLE member_annual_fee (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES member(id),
    year        INTEGER NOT NULL,
    amount_due  NUMERIC(12,2) NOT NULL DEFAULT 300.00,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status      VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    UNIQUE(member_id, year)
);

CREATE TABLE bank_import (
    id          BIGSERIAL PRIMARY KEY,
    file_name   VARCHAR(500) NOT NULL,
    import_date DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    imported_by BIGINT REFERENCES app_user(id)
);

CREATE TABLE bank_import_line (
    id                   BIGSERIAL PRIMARY KEY,
    bank_import_id       BIGINT NOT NULL REFERENCES bank_import(id),
    booking_date         DATE,
    booking_text         VARCHAR(1000),
    amount               NUMERIC(12,2) NOT NULL,
    suggested_member_id  BIGINT REFERENCES member(id),
    match_confidence     INTEGER DEFAULT 0,
    match_status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    confirmed_by         BIGINT REFERENCES app_user(id)
);

ALTER TABLE payment ADD CONSTRAINT fk_payment_bank_import_line
    FOREIGN KEY (bank_import_line_id) REFERENCES bank_import_line(id);

CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id   BIGINT NOT NULL,
    action      VARCHAR(50) NOT NULL,
    old_values  TEXT,
    new_values  TEXT,
    user_id     BIGINT REFERENCES app_user(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_last_name ON member(last_name);
CREATE INDEX idx_member_external_id ON member(external_id);
CREATE INDEX idx_member_status ON member(status);
CREATE INDEX idx_payment_member_id ON payment(member_id);
CREATE INDEX idx_payment_for_year ON payment(for_year);
CREATE INDEX idx_receipt_member_id ON receipt(member_id);
CREATE INDEX idx_cash_book_entry_cash_book_id ON cash_book_entry(cash_book_id);
CREATE INDEX idx_member_annual_fee_member_year ON member_annual_fee(member_id, year);
CREATE INDEX idx_bank_import_line_import_id ON bank_import_line(bank_import_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
