export type Book = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  city: string;
  price: number;
  is_donation: boolean;
  image_url: string;
  seller_id: string;
  seller_name: string;
  can_deliver?: boolean;
  created_at: string;
  status?: "available" | "reserved" | "given";
  reserved_by?: string | null;
  reserved_at?: string | null;
  language?: string;
};
export type BookRequest = {
  id: string;
  book_id: string;
  requester_id: string;
  requester_name: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type Review = {
  id: string;
  seller_id: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  chat_id: string | null;
  created_at: string;
};

export type Chat = {
  id: string;
  participants: string[];
  book_id: string | null;
  book_title: string | null;
  book_image_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_by: string[];
  deleted_for?: string[];
  archived_for?: string[];
  muted_for?: string[];
  created_at: string;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
  read_at?: string | null;
  deleted_for_everyone?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  hidden_for?: string[];
};
