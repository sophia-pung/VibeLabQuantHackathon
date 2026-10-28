import { createClient } from "@supabase/supabase-js";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: { id: string; name: string; created_at: string | null };
        Insert: { id?: string; name: string; created_at?: string | null };
        Update: { id?: string; name?: string; created_at?: string | null };
        Relationships: [];
      };
      team_members: {
        Row: { id: string; team_id: string; user_id: string; joined_at: string | null };
        Insert: { id?: string; team_id: string; user_id: string; joined_at?: string | null };
        Update: { id?: string; team_id?: string; user_id?: string; joined_at?: string | null };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          team_id: string;
          file_name: string;
          file_path: string;
          submission_number: number;
          submitted_at: string | null;
          status: "pending" | "running" | "completed" | "failed";
          error_message: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          file_name: string;
          file_path: string;
          submission_number: number;
          submitted_at?: string | null;
          status?: "pending" | "running" | "completed" | "failed";
          error_message?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          file_name?: string;
          file_path?: string;
          submission_number?: number;
          submitted_at?: string | null;
          status?: "pending" | "running" | "completed" | "failed";
          error_message?: string | null;
        };
        Relationships: [];
      };
      simulation_runs: {
        Row: {
          id: string;
          submission_id: string;
          started_at: string | null;
          completed_at: string | null;
          status: "pending" | "running" | "completed" | "failed";
          score: number | null;
          final_pnl: number | null;
          max_drawdown: number | null;
          total_trades: number;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          submission_id: string;
          started_at?: string | null;
          completed_at?: string | null;
          status?: "pending" | "running" | "completed" | "failed";
          score?: number | null;
          final_pnl?: number | null;
          max_drawdown?: number | null;
          total_trades?: number;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          submission_id?: string;
          started_at?: string | null;
          completed_at?: string | null;
          status?: "pending" | "running" | "completed" | "failed";
          score?: number | null;
          final_pnl?: number | null;
          max_drawdown?: number | null;
          total_trades?: number;
          error_message?: string | null;
        };
        Relationships: [];
      };
      simulation_steps: {
        Row: {
          id: number;
          run_id: string;
          trading_day: number;
          timestamp: number;
          product: string;
          position: number;
          order_depth: Json | null;
          input_trader_data: string | null;
          trading_decisions: Json | null;
          output_trader_data: string | null;
          cash: number | null;
          inventory_value: number | null;
          pnl: number | null;
          score: number | null;
        };
        Insert: {
          id?: number;
          run_id: string;
          trading_day: number;
          timestamp: number;
          product: string;
          position?: number;
          order_depth?: Json | null;
          input_trader_data?: string | null;
          trading_decisions?: Json | null;
          output_trader_data?: string | null;
          cash?: number | null;
          inventory_value?: number | null;
          pnl?: number | null;
          score?: number | null;
        };
        Update: {
          id?: number;
          run_id?: string;
          trading_day?: number;
          timestamp?: number;
          product?: string;
          position?: number;
          order_depth?: Json | null;
          input_trader_data?: string | null;
          trading_decisions?: Json | null;
          output_trader_data?: string | null;
          cash?: number | null;
          inventory_value?: number | null;
          pnl?: number | null;
          score?: number | null;
        };
        Relationships: [];
      };
      market_data: {
        Row: {
          id: number;
          trading_day: number;
          timestamp: number;
          product: string;
          mid_price: number | null;
          buy_orders: Json;
          sell_orders: Json;
          observations: Json | null;
        };
        Insert: {
          id?: number;
          trading_day: number;
          timestamp: number;
          product: string;
          mid_price?: number | null;
          buy_orders?: Json;
          sell_orders?: Json;
          observations?: Json | null;
        };
        Update: {
          id?: number;
          trading_day?: number;
          timestamp?: number;
          product?: string;
          mid_price?: number | null;
          buy_orders?: Json;
          sell_orders?: Json;
          observations?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: {
      leaderboard: {
        Row: {
          rank: number | null;
          team_id: string | null;
          team_name: string | null;
          submission_id: string | null;
          run_id: string | null;
          score: number | null;
          final_pnl: number | null;
          submitted_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_team: { Args: { p_name: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

export const supabaseConfigMissing = !supabaseUrl || !supabaseAnonKey;
export const supabase = supabaseConfigMissing
  ? null
  : createClient<Database>(supabaseUrl, supabaseAnonKey);
