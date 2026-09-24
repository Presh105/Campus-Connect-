import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { notifyUser } from '@/hooks/useNotify';
import { toast } from 'sonner';
import { Bus, Clock, Users, MapPin, Plus, UserCheck, Car, Trash2, IdCard, ShieldCheck, AlertTriangle, History, Image as ImageIcon, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PickupPoint { id: string; name: string; }
interface TransportRequest {
  id: string; user_id: string; pickup_point_id: string | null; destination: string;
  status: string; expires_at: string | null; created_at: string; driver_id: string | null;
  ride_type?: string; location_photo_url?: string | null; phone_number?: string | null; group_key?: string | null;
}
interface Driver { id: string; user_id?: string | null; name: string; phone_number: string | null; vehicle_info: string | null; vehicle_photo_url?: string | null; is_active: boolean; is_available?: boolean; }
interface VerifiedRow {
  id: string; user_id: string;
  can_request_normal: boolean; can_request_urgent: boolean;
  quota_normal: number; quota_urgent: number;
  used_normal: number; used_urgent: number;
  is_driver: boolean;
}
interface AllProfile { user_id: string; full_name: string; system_id: string | null; reg_number: string | null; }
interface Settings { normal_fare: number; urgent_fare: number; normal_threshold: number; }

export function TransportTab() {
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [settings, setSettings] = useState<Settings>({ normal_fare: 0, urgent_fare: 0, normal_threshold: 6 });
  const [verifiedRows, setVerifiedRows] = useState<VerifiedRow[]>([]);
  const [allProfiles, setAllProfiles] = useState<AllProfile[]>([]);
  const [verifiedSearch, setVerifiedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('student');
  const [rideHistory, setRideHistory] = useState<TransportRequest[]>([]);
  const [driverHistory, setDriverHistory] = useState<TransportRequest[]>([]);
  const [newPointName, setNewPointName] = useState('');
  const [driverForm, setDriverForm] = useState<{ name: string; phone_number: string; vehicle_info: string; vehicle_photo_url?: string }>({ name: '', phone_number: '', vehicle_info: '', vehicle_photo_url: '' });
  const [loading, setLoading] = useState(false);

  // Request form
  const [rideType, setRideType] = useState<'normal' | 'urgent'>('normal');
  const [selectedPickup, setSelectedPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [codeInput, setCodeInput] = useState('');

  const studentId = (profile as any)?.system_id || null;
  const myRow = verifiedRows.find(r => r.user_id === user?.id);
  const isVerifiedDriver = !!myRow?.is_driver;

  useEffect(() => {
    fetchPickupPoints();
    fetchRequests();
    fetchDrivers();
    fetchVerifiedRows();
    fetchSettings();
    if (user) fetchRideHistory();
    if (isAdmin) fetchAllProfiles();
  }, [user, isAdmin]);

  useEffect(() => { if (isVerifiedDriver) fetchDriverHistory(); }, [isVerifiedDriver, user]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('transport_settings' as any).select('*').eq('id', 'global').maybeSingle() as any;
    if (data) setSettings(data);
  };
  const fetchVerifiedRows = async () => {
    const { data } = await supabase.from('transport_verified_students' as any).select('*') as any;
    if (data) setVerifiedRows(data);
  };
  const fetchAllProfiles = async () => {
    const { data } = await supabase.from('profiles').select('user_id, full_name, system_id, reg_number').order('full_name');
    if (data) setAllProfiles(data as any);
  };
  const fetchPickupPoints = async () => {
    const { data } = await supabase.from('transport_pickup_points').select('*').eq('is_active', true).order('sort_order');
    if (data) setPickupPoints(data);
  };
  const fetchRequests = async () => {
    const { data } = await supabase.from('transport_requests').select('*').in('status', ['pending', 'accepted']).order('created_at', { ascending: false });
    if (data) setRequests(data as any);
  };
  const fetchDrivers = async () => {
    const { data } = await supabase.from('transport_drivers').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (data) setDrivers(data as any);
  };
  const fetchRideHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from('transport_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (data) setRideHistory(data as any);
  };
  const fetchDriverHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from('transport_requests').select('*').eq('driver_id', user.id).order('created_at', { ascending: false }).limit(30);
    if (data) setDriverHistory(data as any);
  };

  const generateCode = async (type: 'normal' | 'urgent') => {
    if (!user || !myRow) { toast.error('You are not verified for ride codes'); return; }
    const allowed = type === 'normal' ? myRow.can_request_normal : myRow.can_request_urgent;
    if (!allowed) { toast.error(`Admin has not enabled ${type} ride codes for you`); return; }
    const quota = type === 'normal' ? myRow.quota_normal : myRow.quota_urgent;
    const used = type === 'normal' ? myRow.used_normal : myRow.used_urgent;
    if (quota > 0 && used >= quota) { toast.error(`You have used all your ${type} codes`); return; }
    const prefix = type === 'urgent' ? 'UR' : 'NR';
    const code = `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { error } = await supabase.from('transport_ride_codes' as any).insert({ user_id: user.id, code, ride_type: type });
    if (error) { toast.error('Failed to generate'); return; }
    // increment used counter
    const updateField = type === 'normal' ? { used_normal: used + 1 } : { used_urgent: used + 1 };
    await supabase.from('transport_verified_students' as any).update(updateField as any).eq('id', myRow.id);
    toast.success(`Code: ${code}`);
    fetchVerifiedRows();
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('posts').upload(path, file, { contentType: file.type, upsert: false });
    if (error) { toast.error('Photo upload failed: ' + error.message); return null; }
    const { data } = supabase.storage.from('posts').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleRequestRide = async () => {
    if (!user || !selectedPickup || !destination.trim()) { toast.error('Pickup and destination required'); return; }
    if (!codeInput.trim()) { toast.error('Enter a ride code'); return; }

    const code = codeInput.trim().toUpperCase();
    const { data: codeRow } = await supabase.from('transport_ride_codes' as any).select('*').eq('code', code).eq('user_id', user.id).maybeSingle() as any;
    if (!codeRow) { toast.error('Invalid code'); return; }
    if (codeRow.used) { toast.error('Code already used'); return; }
    if (codeRow.ride_type !== rideType) { toast.error(`This is a ${codeRow.ride_type} code, not ${rideType}`); return; }

    if (rideType === 'urgent') {
      if (!phoneNumber.trim()) { toast.error('Phone number required for urgent'); return; }
      if (!photoFile) { toast.error('Location photo required for urgent'); return; }
    }

    setLoading(true);
    let photoUrl: string | null = null;
    if (photoFile) photoUrl = await uploadPhoto(photoFile);

    const groupKey = `${selectedPickup}|${destination.trim().toLowerCase()}|${rideType}`;

    // Normal: must join existing group if one exists
    let joinExisting: TransportRequest | null = null;
    if (rideType === 'normal') {
      const { data: existing } = await supabase.from('transport_requests').select('*')
        .eq('pickup_point_id', selectedPickup).eq('status', 'pending').eq('ride_type', 'normal' as any)
        .ilike('destination', destination.trim());
      if (existing && existing.length > 0) joinExisting = existing[0] as any;
    }

    const insertPayload: any = {
      user_id: user.id,
      pickup_point_id: selectedPickup,
      destination: destination.trim(),
      status: 'pending',
      ride_code: code,
      ride_type: rideType,
      phone_number: phoneNumber.trim() || null,
      location_photo_url: photoUrl || (joinExisting?.location_photo_url ?? null),
      group_key: groupKey,
      is_urgent: rideType === 'urgent',
    };

    const { data: req, error } = await supabase.from('transport_requests').insert(insertPayload).select().single();
    if (error) { toast.error('Failed to request ride'); setLoading(false); return; }

    await supabase.from('transport_ride_codes' as any).update({ used: true, used_at: new Date().toISOString(), request_id: req.id }).eq('id', codeRow.id);

    if (rideType === 'urgent') {
      // alert all available drivers immediately
      const { data: avail } = await supabase.from('transport_drivers').select('user_id').eq('is_active', true).eq('is_available', true).not('user_id', 'is', null);
      for (const d of (avail || [])) {
        if (d.user_id) await notifyUser(d.user_id, '🚨 URGENT ride requested', `${destination.trim()} — phone: ${phoneNumber}`, 'urgent_ride', req.id, 'transport_request');
      }
      toast.success('Urgent ride sent — drivers alerted');
    } else if (joinExisting) {
      toast.success('Joined existing ride at this pickup point');
    } else {
      toast.success(`Ride requested. Waiting for ${settings.normal_threshold - 1} more rider(s) to join.`);
    }

    setDestination(''); setSelectedPickup(''); setPhoneNumber(''); setPhotoFile(null); setCodeInput('');
    fetchRequests(); fetchRideHistory();
    setLoading(false);
  };

  const handleAcceptRide = async (requestId: string) => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    // Find the request and accept the entire group
    const target = requests.find(r => r.id === requestId);
    const groupKey = target?.group_key;
    let q = supabase.from('transport_requests').update({ status: 'accepted', expires_at: expiresAt, driver_id: user?.id || null }) as any;
    if (groupKey) q = q.eq('group_key', groupKey).eq('status', 'pending');
    else q = q.eq('id', requestId);
    const { error } = await q;
    if (error) { toast.error('Failed to accept: ' + error.message); return; }
    toast.success('Ride accepted — rider IDs visible below');
    // Notify the riders
    const ridersIds = requests.filter(r => (groupKey ? r.group_key === groupKey : r.id === requestId)).map(r => r.user_id);
    for (const uid of [...new Set(ridersIds)]) {
      if (uid) await notifyUser(uid, '🚗 Your ride was accepted', 'A driver is on the way to your pickup point.', 'transport_accept', requestId, 'transport_request');
    }
    fetchRequests(); fetchDriverHistory();
  };

  const handleRemoveRequest = async (id: string) => {
    const { error } = await supabase.from('transport_requests').delete().eq('id', id);
    if (error) toast.error('Failed'); else { toast.success('Removed'); fetchRequests(); }
  };

  const handleAddPickupPoint = async () => {
    if (!newPointName.trim()) return;
    const { error } = await supabase.from('transport_pickup_points').insert({ name: newPointName.trim() });
    if (error) toast.error('Failed'); else { toast.success('Added'); setNewPointName(''); fetchPickupPoints(); }
  };
  const handleRemovePickupPoint = async (id: string) => {
    await supabase.from('transport_pickup_points').update({ is_active: false }).eq('id', id);
    fetchPickupPoints();
  };
  const handleAddDriver = async () => {
    if (!driverForm.name.trim() || !user) return;
    const { error } = await supabase.from('transport_drivers').insert({ name: driverForm.name.trim(), phone_number: driverForm.phone_number.trim() || null, vehicle_info: driverForm.vehicle_info.trim() || null, vehicle_photo_url: driverForm.vehicle_photo_url || null, added_by: user.id } as any);
    if (error) toast.error('Failed'); else { toast.success('Driver added'); setDriverForm({ name: '', phone_number: '', vehicle_info: '', vehicle_photo_url: '' }); fetchDrivers(); }
  };
  const handleRemoveDriver = async (id: string) => {
    await supabase.from('transport_drivers').update({ is_active: false }).eq('id', id);
    fetchDrivers();
  };

  const updateVerifiedRow = async (targetUserId: string, patch: Partial<VerifiedRow>) => {
    const existing = verifiedRows.find(r => r.user_id === targetUserId);
    if (existing) {
      const { error } = await supabase.from('transport_verified_students' as any).update(patch as any).eq('id', existing.id);
      if (error) { toast.error('Failed'); return; }
    } else {
      const { error } = await supabase.from('transport_verified_students' as any).insert({ user_id: targetUserId, added_by: user?.id, ...patch } as any);
      if (error) { toast.error('Failed'); return; }
    }
    fetchVerifiedRows();
  };

  const saveSettings = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await supabase.from('transport_settings' as any).update(patch as any).eq('id', 'global');
  };

  // Group pending requests by pickup+destination+type
  const pendingGroups: Record<string, TransportRequest[]> = {};
  requests.filter(r => r.status === 'pending').forEach(r => {
    const k = r.group_key || `${r.pickup_point_id}-${r.destination}-${r.ride_type}`;
    (pendingGroups[k] = pendingGroups[k] || []).push(r);
  });

  const tabItems = isAdmin
    ? [{ value: 'student', label: 'Rider', icon: UserCheck }, { value: 'driver', label: 'Driver', icon: Car }, { value: 'verified', label: 'Verified', icon: ShieldCheck }]
    : isVerifiedDriver
    ? [{ value: 'student', label: 'Rider', icon: UserCheck }, { value: 'driver', label: 'Driver', icon: Car }]
    : [{ value: 'student', label: 'Rider', icon: UserCheck }];
  const tabCols = tabItems.length === 3 ? 'grid-cols-3' : tabItems.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`w-full grid rounded-xl ${tabCols}`}>
        {tabItems.map(item => (
          <TabsTrigger key={item.value} value={item.value} className="rounded-lg">
            <item.icon className="w-4 h-4 mr-2" /> {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* STUDENT */}
      <TabsContent value="student" className="mt-4 space-y-4">
        {studentId && (
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center gap-3">
              <IdCard className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Your Transport ID</p>
                <p className="font-mono font-bold text-sm">{studentId}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-full text-xs shrink-0" onClick={() => { navigator.clipboard.writeText(studentId); toast.success('Copied'); }}>Copy</Button>
            </div>
          </Card>
        )}

        {/* Fare info */}
        <Card className="p-3 grid grid-cols-2 gap-2 text-center">
          <div><p className="text-xs text-muted-foreground">Normal Fare</p><p className="font-bold text-primary">₦{settings.normal_fare}</p></div>
          <div><p className="text-xs text-muted-foreground">Urgent Fare</p><p className="font-bold text-destructive">₦{settings.urgent_fare}</p></div>
        </Card>

        <Alert className="border-primary/20 bg-primary/5">
          <MapPin className="w-4 h-4 text-primary" />
          <AlertDescription className="text-sm">
            📍 Destinations are <strong>inside the local area only</strong> for now — this keeps fares manageable for everyone.
          </AlertDescription>
        </Alert>

        {/* Available drivers (with vehicle photo for recognition) */}
        {drivers.length > 0 && (
          <Card className="p-3 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Verified Drivers & Vehicles</h3>
            <div className="grid grid-cols-2 gap-2">
              {drivers.map(d => (
                <div key={d.id} className="rounded-lg overflow-hidden bg-muted/40">
                  {d.vehicle_photo_url ? (
                    <img src={d.vehicle_photo_url} alt={d.name} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center bg-muted"><Car className="w-6 h-6 text-muted-foreground" /></div>
                  )}
                  <div className="p-1.5">
                    <p className="text-xs font-semibold truncate">{d.name}</p>
                    {d.vehicle_info && <p className="text-[10px] text-muted-foreground truncate">{d.vehicle_info}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Code generation */}
        {myRow && (myRow.can_request_normal || myRow.can_request_urgent) && (
          <Card className="p-4 space-y-3 border-primary/20">
            <h3 className="font-semibold flex items-center gap-2"><IdCard className="w-5 h-5 text-primary" /> Generate Ride Code</h3>
            {myRow.can_request_normal && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Normal Ride</p>
                  <p className="text-xs text-muted-foreground">Used {myRow.used_normal}{myRow.quota_normal > 0 ? ` / ${myRow.quota_normal}` : ''}</p>
                </div>
                <Button size="sm" className="rounded-xl" onClick={() => generateCode('normal')}>Generate Normal</Button>
              </div>
            )}
            {myRow.can_request_urgent && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1"><Zap className="w-3 h-3 text-destructive" /> Urgent Ride</p>
                  <p className="text-xs text-muted-foreground">Used {myRow.used_urgent}{myRow.quota_urgent > 0 ? ` / ${myRow.quota_urgent}` : ''}</p>
                </div>
                <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => generateCode('urgent')}>Generate Urgent</Button>
              </div>
            )}
            <ActiveCodesList userId={user?.id} />
          </Card>
        )}

        {(!myRow || (!myRow.can_request_normal && !myRow.can_request_urgent)) && (
          <Alert className="border-warning/30 bg-warning/5">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <AlertDescription className="text-sm">
              Admin must enable ride code generation for you. <button onClick={() => navigate('/contact')} className="text-primary underline font-semibold">Contact admin</button>.
            </AlertDescription>
          </Alert>
        )}

        {/* Request form */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Bus className="w-5 h-5 text-primary" /> Request a Ride</h3>
          <div className="flex gap-2">
            <Button size="sm" variant={rideType === 'normal' ? 'default' : 'outline'} className="flex-1 rounded-xl" onClick={() => setRideType('normal')}>Normal</Button>
            <Button size="sm" variant={rideType === 'urgent' ? 'destructive' : 'outline'} className="flex-1 rounded-xl" onClick={() => setRideType('urgent')}>
              <Zap className="w-3 h-3 mr-1" /> Urgent
            </Button>
          </div>
          <div className="space-y-2">
            <Label>Ride Code</Label>
            <Input placeholder={rideType === 'urgent' ? 'UR-XXXXXX' : 'NR-XXXXXX'} value={codeInput} onChange={e => setCodeInput(e.target.value)} className="rounded-xl font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Pickup Point</Label>
            <Select value={selectedPickup} onValueChange={setSelectedPickup}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select pickup" /></SelectTrigger>
              <SelectContent>{pickupPoints.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Destination</Label>
            <Input placeholder="Where to?" value={destination} onChange={e => setDestination(e.target.value)} className="rounded-xl" />
          </div>
          {rideType === 'urgent' && (
            <>
              <div className="space-y-2">
                <Label>Phone Number <span className="text-destructive">*</span></Label>
                <Input placeholder="For driver to reach you" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Location Photo <span className="text-destructive">*</span></Label>
                <Input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="rounded-xl" />
              </div>
            </>
          )}
          {rideType === 'normal' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Location Photo (optional, first requester sets it)</Label>
              <Input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="rounded-xl" />
              <Input placeholder="Phone (optional)" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="rounded-xl" />
            </div>
          )}
          <Button onClick={handleRequestRide} disabled={loading} className="w-full rounded-xl">
            <MapPin className="w-4 h-4 mr-2" /> {loading ? 'Requesting…' : `Request ${rideType === 'urgent' ? 'Urgent' : 'Normal'} Ride`}
          </Button>
        </Card>

        {/* History */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2"><History className="w-4 h-4" /> Your Ride History</h3>
          {rideHistory.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground text-sm">No ride history</Card>
          ) : rideHistory.slice(0, 10).map(req => {
            const pickup = pickupPoints.find(p => p.id === req.pickup_point_id);
            return (
              <Card key={req.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{pickup?.name || 'Unknown'} → {req.destination}</p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup?.name || '')}&destination=${encodeURIComponent(req.destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    <MapPin className="w-3 h-3" /> Directions
                  </a>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={req.ride_type === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">{req.ride_type || 'normal'}</Badge>
                  <Badge variant="outline" className="text-xs">{req.status}</Badge>
                  {req.status === 'accepted' && req.expires_at && <CountdownTimer expiresAt={req.expires_at} />}
                </div>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      {/* DRIVER */}
      {(isAdmin || isVerifiedDriver) && (
        <TabsContent value="driver" className="mt-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Verified Drivers</h3>
            {drivers.map(d => (
              <Card key={d.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{d.name}</p>
                    {d.vehicle_info && <p className="text-xs text-muted-foreground truncate">{d.vehicle_info}</p>}
                    {d.phone_number && <p className="text-xs text-primary">{d.phone_number}</p>}
                    <Badge variant={d.is_available !== false ? 'default' : 'outline'} className="text-xs mt-1">
                      {d.is_available !== false ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={async () => {
                      const next = d.is_available === false;
                      await supabase.from('transport_drivers').update({ is_available: next }).eq('id', d.id);
                      fetchDrivers();
                    }}>Toggle</Button>
                    {isAdmin && <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => handleRemoveDriver(d.id)}><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Pending Ride Requests</h3>
            {Object.entries(pendingGroups).length === 0 ? (
              <Card className="p-4 text-center text-muted-foreground text-sm">No pending requests</Card>
            ) : Object.entries(pendingGroups).map(([key, group]) => {
              const first = group[0];
              const pickup = pickupPoints.find(p => p.id === first.pickup_point_id);
              const isUrgent = first.ride_type === 'urgent';
              const meetsThreshold = isUrgent || group.length >= settings.normal_threshold;
              const photo = group.find(g => g.location_photo_url)?.location_photo_url;
              const phone = group.find(g => g.phone_number)?.phone_number;
              return (
                <Card key={key} className={`p-3 ${isUrgent ? 'border-destructive border-2' : meetsThreshold ? 'border-success border-2' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{pickup?.name || 'Unknown'} → {first.destination}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={isUrgent ? 'destructive' : 'secondary'} className="text-xs">{isUrgent ? 'URGENT' : 'NORMAL'}</Badge>
                        <Badge variant="outline" className="text-xs"><Users className="w-3 h-3 mr-1" />{group.length} waiting</Badge>
                        {!isUrgent && !meetsThreshold && <Badge variant="outline" className="text-xs">Need {settings.normal_threshold - group.length} more</Badge>}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickup?.name || '')}&destination=${encodeURIComponent(first.destination)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" /> Directions
                        </a>
          </div>

          {/* Accepted rides — show student CC IDs */}
          {requests.filter(r => r.status === 'accepted' && (isAdmin || r.driver_id === user?.id)).length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Accepted Rides — Rider IDs</h3>
              {requests.filter(r => r.status === 'accepted' && (isAdmin || r.driver_id === user?.id))
                .reduce<TransportRequest[]>((acc, r) => acc.find(a => a.group_key === r.group_key) ? acc : [...acc, r], [])
                .map(r => {
                  const pickup = pickupPoints.find(p => p.id === r.pickup_point_id);
                  return (
                    <Card key={r.id} className="p-3 border-success/50 border">
                      <p className="font-medium text-sm">{pickup?.name || 'Unknown'} → {r.destination}</p>
                      <Badge variant="outline" className="text-xs mt-1">accepted</Badge>
                      <AcceptedRideStudents groupKey={r.group_key} />
                    </Card>
                  );
                })}
            </div>
          )}
                      {phone && <p className="text-xs text-primary mt-1">📞 {phone}</p>}
                      {photo && <a href={photo} target="_blank" rel="noopener" className="block mt-2"><img src={photo} className="w-full max-h-40 object-cover rounded-lg" /></a>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" disabled={!meetsThreshold} className="rounded-xl text-xs" onClick={() => handleAcceptRide(first.id)}>Accept</Button>
                      {isAdmin && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveRequest(first.id)}><Trash2 className="w-3 h-3" /></Button>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {isVerifiedDriver && driverHistory.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2"><History className="w-4 h-4" /> Your Driver History</h3>
              {driverHistory.map(req => {
                const pickup = pickupPoints.find(p => p.id === req.pickup_point_id);
                return (
                  <Card key={req.id} className="p-3">
                    <p className="font-medium text-sm">{pickup?.name || 'Unknown'} → {req.destination}</p>
                    <Badge variant="outline" className="text-xs mt-1">{req.status}</Badge>
                    {req.status === 'accepted' && <AcceptedRideStudents groupKey={req.group_key} />}
                  </Card>
                );
              })}
            </div>
          )}

          {isAdmin && (<>
            <Card className="p-4 space-y-3 border-primary/20">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add Verified Driver</h3>
              <Input placeholder="Driver name" value={driverForm.name} onChange={e => setDriverForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl" />
              <Input placeholder="Phone number" value={driverForm.phone_number} onChange={e => setDriverForm(p => ({ ...p, phone_number: e.target.value }))} className="rounded-xl" />
              <Input placeholder="Vehicle info (e.g. Blue Toyota Hiace)" value={driverForm.vehicle_info} onChange={e => setDriverForm(p => ({ ...p, vehicle_info: e.target.value }))} className="rounded-xl" />
              <DriverPhotoUploader onUploaded={(url) => setDriverForm(p => ({ ...p, vehicle_photo_url: url } as any))} currentUrl={(driverForm as any).vehicle_photo_url} />
              <Button size="sm" onClick={handleAddDriver} className="rounded-xl w-full">Add Driver</Button>
            </Card>
            <Card className="p-4 space-y-3 border-primary/20">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Pickup Points</h3>
              <div className="flex gap-2">
                <Input placeholder="Point name" value={newPointName} onChange={e => setNewPointName(e.target.value)} className="rounded-xl flex-1" />
                <Button size="sm" onClick={handleAddPickupPoint} className="rounded-xl">Add</Button>
              </div>
              {pickupPoints.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemovePickupPoint(p.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </Card>
          </>)}
        </TabsContent>
      )}

      {/* VERIFIED — Admin only */}
      {isAdmin && (
        <TabsContent value="verified" className="mt-4 space-y-4">
          <Card className="p-4 space-y-3 border-primary/20">
            <h3 className="font-semibold text-sm">Fares & Threshold</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Normal fare (₦)</Label>
                <Input type="number" value={settings.normal_fare} onChange={e => saveSettings({ normal_fare: Number(e.target.value) })} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs">Urgent fare (₦)</Label>
                <Input type="number" value={settings.urgent_fare} onChange={e => saveSettings({ urgent_fare: Number(e.target.value) })} className="rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Min riders for normal ride</Label>
                <Input type="number" min={1} value={settings.normal_threshold} onChange={e => saveSettings({ normal_threshold: Number(e.target.value) })} className="rounded-xl" />
              </div>
            </div>
          </Card>

          <Alert className="border-primary/20 bg-primary/5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <AlertDescription className="text-sm">
              Toggle Normal / Urgent code permission for each user, set their quota, and designate drivers.
            </AlertDescription>
          </Alert>

          <Input placeholder="Search by name, reg, or ID…" value={verifiedSearch} onChange={e => setVerifiedSearch(e.target.value)} className="rounded-xl" />

          <div className="space-y-2">
            {allProfiles.filter(p => {
              const q = verifiedSearch.toLowerCase().trim();
              if (!q) return true;
              return p.full_name?.toLowerCase().includes(q) || p.reg_number?.toLowerCase().includes(q) || p.system_id?.toLowerCase().includes(q);
            }).map(p => {
              const row = verifiedRows.find(r => r.user_id === p.user_id);
              return (
                <Card key={p.user_id} className="p-3 space-y-2">
                  <div>
                    <p className="font-medium text-sm">{p.full_name}</p>
                    {p.system_id && <p className="text-xs text-muted-foreground font-mono">{p.system_id}</p>}
                    {p.reg_number && <p className="text-xs text-muted-foreground">Reg: {p.reg_number}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-lg p-2">
                      <span>Normal codes</span>
                      <Switch checked={!!row?.can_request_normal} onCheckedChange={(v) => updateVerifiedRow(p.user_id, { can_request_normal: v })} />
                    </label>
                    <label className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-lg p-2">
                      <span>Urgent codes</span>
                      <Switch checked={!!row?.can_request_urgent} onCheckedChange={(v) => updateVerifiedRow(p.user_id, { can_request_urgent: v })} />
                    </label>
                    <div>
                      <Label className="text-[10px]">Normal quota (0=∞)</Label>
                      <Input type="number" min={0} defaultValue={row?.quota_normal ?? 0} onBlur={(e) => updateVerifiedRow(p.user_id, { quota_normal: Number(e.target.value) })} className="rounded-lg h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Urgent quota (0=∞)</Label>
                      <Input type="number" min={0} defaultValue={row?.quota_urgent ?? 0} onBlur={(e) => updateVerifiedRow(p.user_id, { quota_urgent: Number(e.target.value) })} className="rounded-lg h-8 text-xs" />
                    </div>
                    <label className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-lg p-2 col-span-2">
                      <span>Designate as Driver</span>
                      <Switch checked={!!row?.is_driver} onCheckedChange={(v) => updateVerifiedRow(p.user_id, { is_driver: v })} />
                    </label>
                  </div>
                  {row && (row.used_normal > 0 || row.used_urgent > 0) && (
                    <p className="text-[10px] text-muted-foreground">Used — Normal: {row.used_normal} · Urgent: {row.used_urgent}</p>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}

function CountdownTimer({ expiresAt }: { expiresAt: string | null }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  if (!timeLeft) return null;
  const isExpired = timeLeft === 'Expired';
  return <span className={`flex items-center gap-1 text-xs ${isExpired ? 'text-destructive' : 'text-primary'}`}><Clock className="w-3 h-3" />{timeLeft}</span>;
}

function ActiveCodesList({ userId }: { userId?: string }) {
  const [codes, setCodes] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from('transport_ride_codes' as any).select('*').eq('user_id', userId).eq('used', false).order('created_at', { ascending: false }).limit(20)
      .then(({ data }: any) => { if (data) setCodes(data); });
  }, [userId]);
  if (codes.length === 0) return null;
  const copy = (code: string) => { navigator.clipboard.writeText(code); toast.success('Code copied'); };
  return (
    <div className="space-y-1 pt-2 border-t border-border">
      <p className="text-xs font-medium text-muted-foreground">Active codes (tap to copy):</p>
      {codes.map(c => (
        <button key={c.id} onClick={() => copy(c.code)} className="w-full flex items-center justify-between bg-muted/50 hover:bg-muted rounded-lg p-2 transition-colors active:scale-[0.98]">
          <span className="font-mono font-bold text-sm">{c.code}</span>
          <Badge variant={c.ride_type === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">{c.ride_type}</Badge>
        </button>
      ))}
    </div>
  );
}

function AcceptedRideStudents({ groupKey }: { groupKey?: string | null }) {
  const [rows, setRows] = useState<{ system_id: string | null; full_name: string; phone_number: string | null }[]>([]);
  useEffect(() => {
    if (!groupKey) return;
    (async () => {
      const { data: reqs } = await supabase.from('transport_requests').select('user_id, phone_number').eq('group_key', groupKey);
      if (!reqs) return;
      const ids = [...new Set(reqs.map(r => r.user_id))];
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name, system_id').in('user_id', ids);
      const map = new Map((profs || []).map(p => [p.user_id, p]));
      setRows(reqs.map(r => ({
        system_id: (map.get(r.user_id) as any)?.system_id || null,
        full_name: (map.get(r.user_id) as any)?.full_name || 'Member',
        phone_number: r.phone_number,
      })));
    })();
  }, [groupKey]);
  if (!rows.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-border space-y-1">
      <p className="text-[10px] text-muted-foreground font-semibold">Riders on this ride:</p>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-2 bg-muted/40 rounded p-1.5">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{r.full_name}</p>
            {r.system_id && (
              <button onClick={() => { navigator.clipboard.writeText(r.system_id!); toast.success('CC ID copied'); }} className="text-[10px] font-mono text-primary hover:underline">{r.system_id}</button>
            )}
          </div>
          {r.phone_number && <span className="text-[10px] text-primary shrink-0">📞 {r.phone_number}</span>}
        </div>
      ))}
    </div>
  );
}

function DriverPhotoUploader({ onUploaded, currentUrl }: { onUploaded: (url: string) => void; currentUrl?: string }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `driver-vehicles/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('posts').upload(path, file, { contentType: file.type });
    if (error) { toast.error('Upload failed'); setUploading(false); return; }
    const { data } = supabase.storage.from('posts').getPublicUrl(path);
    onUploaded(data.publicUrl);
    toast.success('Vehicle photo uploaded');
    setUploading(false);
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Vehicle photo</Label>
      <Input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="rounded-xl" />
      {currentUrl && <img src={currentUrl} alt="vehicle" className="w-full max-h-32 object-cover rounded-lg" />}
    </div>
  );
}
