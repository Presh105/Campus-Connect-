
-- Food pantries table
CREATE TABLE public.food_pantries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.food_pantries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Food pantries viewable by authenticated" ON public.food_pantries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert food pantries" ON public.food_pantries FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update food pantries" ON public.food_pantries FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete food pantries" ON public.food_pantries FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Misplaced items table (lost & found)
CREATE TABLE public.misplaced_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'lost',
  item_name text NOT NULL,
  description text NOT NULL,
  last_seen_location text,
  pickup_location text,
  image_url text,
  is_resolved boolean DEFAULT false,
  contact_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.misplaced_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items viewable by authenticated" ON public.misplaced_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can report items" ON public.misplaced_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.misplaced_items FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users or admins can delete items" ON public.misplaced_items FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Misplaced items type validation trigger
CREATE OR REPLACE FUNCTION public.validate_misplaced_item_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('lost', 'found') THEN
    RAISE EXCEPTION 'type must be either lost or found';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_misplaced_item_type_trigger
  BEFORE INSERT OR UPDATE ON public.misplaced_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_misplaced_item_type();

-- Transport pickup points (admin managed)
CREATE TABLE public.transport_pickup_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transport_pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pickup points viewable by authenticated" ON public.transport_pickup_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage pickup points" ON public.transport_pickup_points FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Transport drivers (admin managed)
CREATE TABLE public.transport_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone_number text,
  vehicle_info text,
  is_active boolean DEFAULT true,
  added_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transport_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers viewable by authenticated" ON public.transport_drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage drivers" ON public.transport_drivers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Transport requests
CREATE TABLE public.transport_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pickup_point_id uuid REFERENCES public.transport_pickup_points(id),
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  driver_id uuid REFERENCES public.transport_drivers(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requests viewable by authenticated" ON public.transport_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create requests" ON public.transport_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own or admin" ON public.transport_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own or admin" ON public.transport_requests FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Transport request status validation
CREATE OR REPLACE FUNCTION public.validate_transport_request_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted', 'completed', 'expired') THEN
    RAISE EXCEPTION 'Invalid transport request status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_transport_request_status_trigger
  BEFORE INSERT OR UPDATE ON public.transport_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_transport_request_status();
