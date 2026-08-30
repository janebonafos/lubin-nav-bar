revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.is_encounter_provider(uuid) from anon;
revoke execute on function public.is_draft_provider(uuid) from anon;
revoke execute on function public.is_encounter_patient(uuid) from anon, authenticated;
revoke execute on function public.can_prescribe_ph(uuid, uuid) from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.protect_signed_prescription() from anon, authenticated;
revoke execute on function public.protect_signature_events() from anon, authenticated;