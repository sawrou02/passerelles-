
REVOKE EXECUTE ON FUNCTION public._require_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._is_target_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_warn_user(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_user(uuid, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_unban_user(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_send_message(uuid, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_warn_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_message(uuid, text) TO authenticated;
