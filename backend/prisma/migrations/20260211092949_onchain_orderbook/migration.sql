-- CreateTable
CREATE TABLE "users" (
    "address" VARCHAR(42) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
CREATE TABLE "loan_requests" (
    "id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "contract_address" VARCHAR(42) NOT NULL,
    "onchain_request_id" DECIMAL(78,0) NOT NULL,
    "borrower_address" VARCHAR(42) NOT NULL,
    "collateral_token_address" VARCHAR(42) NOT NULL,
    "collateral_amount" DECIMAL(78,0) NOT NULL,
    "principal_token_address" VARCHAR(42) NOT NULL,
    "principal_amount" DECIMAL(78,0) NOT NULL,
    "interest_bps" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "create_tx_hash" VARCHAR(66) NOT NULL,
    "cancel_tx_hash" VARCHAR(66),
    "created_at_block" BIGINT NOT NULL,
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "contract_address" VARCHAR(42) NOT NULL,
    "onchain_loan_id" DECIMAL(78,0) NOT NULL,
    "request_id" UUID,
    "borrower_address" VARCHAR(42) NOT NULL,
    "lender_address" VARCHAR(42) NOT NULL,
    "start_timestamp" BIGINT NOT NULL,
    "due_timestamp" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "fund_tx_hash" VARCHAR(66) NOT NULL,
    "repay_tx_hash" VARCHAR(66),
    "claim_tx_hash" VARCHAR(66),
    "indexed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tokens_is_allowed_idx" ON "tokens"("is_allowed");

-- CreateIndex
CREATE INDEX "loan_requests_status_idx" ON "loan_requests"("status");

-- CreateIndex
CREATE INDEX "loan_requests_borrower_address_idx" ON "loan_requests"("borrower_address");

-- CreateIndex
CREATE INDEX "loan_requests_chain_id_status_idx" ON "loan_requests"("chain_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "loan_requests_chain_id_contract_address_onchain_request_id_key" ON "loan_requests"("chain_id", "contract_address", "onchain_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "loans_request_id_key" ON "loans"("request_id");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_borrower_address_idx" ON "loans"("borrower_address");

-- CreateIndex
CREATE INDEX "loans_lender_address_idx" ON "loans"("lender_address");

-- CreateIndex
CREATE INDEX "loans_due_timestamp_status_idx" ON "loans"("due_timestamp", "status");

-- CreateIndex
CREATE UNIQUE INDEX "loans_chain_id_onchain_loan_id_key" ON "loans"("chain_id", "onchain_loan_id");

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_borrower_address_fkey" FOREIGN KEY ("borrower_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_chain_id_collateral_token_address_fkey" FOREIGN KEY ("chain_id", "collateral_token_address") REFERENCES "tokens"("chain_id", "address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_requests" ADD CONSTRAINT "loan_requests_chain_id_principal_token_address_fkey" FOREIGN KEY ("chain_id", "principal_token_address") REFERENCES "tokens"("chain_id", "address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "loan_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_address_fkey" FOREIGN KEY ("borrower_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_lender_address_fkey" FOREIGN KEY ("lender_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
