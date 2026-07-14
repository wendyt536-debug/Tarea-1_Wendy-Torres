import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VALID_ROLES = ["Administrator", "Contracting", "Management", "Requester"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Verify the caller is an admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the JWT from the request to verify the caller
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized — missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized — invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Check caller is admin
    const { data: callerProfile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "Administrator") {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // ----- CREATE USER -----
    if (action === "create") {
      const { email, password, name, role, job_title, nuid, kp_entity, active } = body;

      if (!email || !password || !name || !role) {
        return new Response(JSON.stringify({ error: "Missing required fields: email, password, name, role" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const normalizedRole = VALID_ROLES.includes(role) ? role : "Requester";

      // Create auth user
      const { data: authUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: normalizedRole },
      });

      if (createErr || !authUser?.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create auth user" }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Upsert profile record
      const { error: profileErr } = await supabaseAdmin
        .from("users")
        .upsert({
          id: authUser.user.id,
          email,
          name,
          role: normalizedRole,
          active: active ?? true,
          job_title: job_title ?? null,
          nuid: nuid ?? null,
          kp_entity: kp_entity ?? null,
          updated_at: new Date().toISOString(),
        });

      if (profileErr) {
        // Clean up: delete the auth user if profile upsert fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        user: { id: authUser.user.id, email, name, role: normalizedRole },
      }), {
        status: 201,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // ----- RESET PASSWORD -----
    if (action === "reset-password") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Get user email
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (!targetUser?.user?.email) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      const { error: resetErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetUser.user.email,
      });

      if (resetErr) {
        return new Response(JSON.stringify({ error: resetErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Password reset email sent" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});