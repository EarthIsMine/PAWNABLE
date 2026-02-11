-- CreateTable
CREATE TABLE "users" (
    "address" VARCHAR(42) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "tokens" (
    "chain_id" INTEGER NOT NULL,
    "address" VARCHAR(42) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "decimals" INTEGER NOT NULL,
    "is_native" BOOLEAN NOT NULL DEFAULT false,
    "is_allowed" BOOLEAN NOT NULL DEFAULT true,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("chain_id","address")
);

-- CreateTable
CREATE TABLE "intents" (
    "id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "verifying_contract" VARCHAR(42) NOT NULL,
    "borrower_address" VARCHAR(42) NOT NULL,
    "collateral_token_address" VARCHAR(42) NOT NULL,
    "collateral_amount" DECIMAL(78,0) NOT NULL,
    "principal_token_address" VARCHAR(42) NOT NULL,
    "principal_amount" DECIMAL(78,0) NOT NULL,
    "interest_bps" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "intent_nonce" DECIMAL(78,0) NOT NULL,
    "deadline_timestamp" BIGINT NOT NULL,
    "intent_hash" VARCHAR(66) NOT NULL,
    "signature" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "executed_tx_hash" VARCHAR(66),
    "executed_loan_id" DECIMAL(78,0),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_state_snapshots" (
    "id" UUID NOT NULL,
    "intent_id" UUID NOT NULL,
    "block_number" BIGINT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collateral_balance" DECIMAL(78,0) NOT NULL,
    "collateral_allowance" DECIMAL(78,0) NOT NULL,
    "derived_status" VARCHAR(20) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "intent_state_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "verifying_contract" VARCHAR(42) NOT NULL,
    "loan_id" DECIMAL(78,0) NOT NULL,
    "intent_id" UUID,
    "borrower_address" VARCHAR(42) NOT NULL,
    "lender_address" VARCHAR(42) NOT NULL,
    "start_timestamp" BIGINT NOT NULL,
    "due_timestamp" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "start_tx_hash" VARCHAR(66) NOT NULL,
    "repaid_tx_hash" VARCHAR(66),
    "claimed_tx_hash" VARCHAR(66),
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tokens_is_allowed_idx" ON "tokens"("is_allowed");

-- CreateIndex
CREATE INDEX "intents_status_idx" ON "intents"("status");

-- CreateIndex
CREATE INDEX "intents_borrower_address_idx" ON "intents"("borrower_address");

-- CreateIndex
CREATE INDEX "intents_chain_id_status_idx" ON "intents"("chain_id", "status");

-- CreateIndex
CREATE INDEX "intents_deadline_timestamp_idx" ON "intents"("deadline_timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "intents_chain_id_verifying_contract_intent_hash_key" ON "intents"("chain_id", "verifying_contract", "intent_hash");

-- CreateIndex
CREATE INDEX "intent_state_snapshots_intent_id_checked_at_idx" ON "intent_state_snapshots"("intent_id", "checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "loans_intent_id_key" ON "loans"("intent_id");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_borrower_address_idx" ON "loans"("borrower_address");

-- CreateIndex
CREATE INDEX "loans_lender_address_idx" ON "loans"("lender_address");

-- CreateIndex
CREATE INDEX "loans_due_timestamp_status_idx" ON "loans"("due_timestamp", "status");

-- CreateIndex
CREATE UNIQUE INDEX "loans_chain_id_loan_id_key" ON "loans"("chain_id", "loan_id");

-- AddForeignKey
ALTER TABLE "intents" ADD CONSTRAINT "intents_borrower_address_fkey" FOREIGN KEY ("borrower_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intents" ADD CONSTRAINT "intents_chain_id_collateral_token_address_fkey" FOREIGN KEY ("chain_id", "collateral_token_address") REFERENCES "tokens"("chain_id", "address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intents" ADD CONSTRAINT "intents_chain_id_principal_token_address_fkey" FOREIGN KEY ("chain_id", "principal_token_address") REFERENCES "tokens"("chain_id", "address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_state_snapshots" ADD CONSTRAINT "intent_state_snapshots_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "intents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_address_fkey" FOREIGN KEY ("borrower_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_lender_address_fkey" FOREIGN KEY ("lender_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
