-- Add is_verified column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create wallet_signatures table
CREATE TABLE IF NOT EXISTS wallet_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  signature TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS wallet_signatures_wallet_address_idx ON wallet_signatures(wallet_address);

-- Add smart_wallet_address column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS smart_wallet_address TEXT;

-- Create smart_wallets table to store smart wallet details
CREATE TABLE IF NOT EXISTS smart_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL UNIQUE,
  owner_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  network_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index on owner_address for faster lookups
CREATE INDEX IF NOT EXISTS smart_wallets_owner_address_idx ON smart_wallets(owner_address);

-- Create index on address for faster lookups
CREATE INDEX IF NOT EXISTS smart_wallets_address_idx ON smart_wallets(address);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet_signatures table
CREATE TRIGGER update_wallet_signatures_updated_at
BEFORE UPDATE ON wallet_signatures
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for smart_wallets table
CREATE TRIGGER update_smart_wallets_updated_at
BEFORE UPDATE ON smart_wallets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
