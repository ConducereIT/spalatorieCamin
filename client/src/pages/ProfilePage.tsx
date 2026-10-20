import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, type Me } from "../lib/api";
import { authClient } from "../lib/auth";
import { useSaveProfile } from "../lib/queries";
import { Button, Field, Notice } from "../components/ui";
import { Credits } from "../components/Credits";
import { useToast } from "../components/Toasts";

const PHONE = /^\+?\d{9,15}$/;
const ROOM = /^[A-Z0-9][A-Z0-9 -]{0,11}$/;

export function ProfilePage({ me }: { me: Me }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const save = useSaveProfile();
  const [errors, setErrors] = useState<{ phone?: string; room?: string }>({});
  const required = !me.profile;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") ?? "").replace(/[\s().-]/g, "");
    const room = String(form.get("room") ?? "").trim().toUpperCase().replace(/\s+/g, " ");
    const next = {
      phone: PHONE.test(phone) ? undefined : "Numărul de telefon nu este valid.",
      room: ROOM.test(room) ? undefined : "Camera nu este validă.",
    };
    setErrors(next);
    if (next.phone || next.room) return;
    save.mutate(
      { phone, room },
      {
        onSuccess: () => {
          toast("Profilul a fost salvat.");
          if (required) navigate("/", { replace: true });
        },
      },
    );
  };

  const signOut = async () => {
    await authClient.signOut();
    qc.clear();
    navigate("/autentificare", { replace: true });
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-[24px] font-semibold">Profil</h1>

      {required && (
        <Notice>Completați telefonul și camera pentru a face programări.</Notice>
      )}

      <section className="rounded-3xl border border-line bg-surface p-6">
        <div className="mb-5">
          <p className="text-[15px] font-medium">{me.user.name}</p>
          <p className="text-[14px] text-ink-2 break-all">{me.user.email}</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            label="Telefon"
            defaultValue={me.profile?.phone ?? ""}
            maxLength={20}
            error={errors.phone}
          />
          <Field
            id="room"
            name="room"
            label="Camera"
            placeholder="C319"
            autoCapitalize="characters"
            autoComplete="off"
            defaultValue={me.profile?.room ?? ""}
            maxLength={12}
            error={errors.room}
          />
          {save.error && (
            <Notice tone="error">{save.error instanceof ApiError ? save.error.message : "Salvarea nu a reușit."}</Notice>
          )}
          <Button type="submit" busy={save.isPending} className="mt-1 self-start">
            Salvare
          </Button>
        </form>
      </section>

      <Button variant="secondary" onClick={signOut} className="self-start">
        Deconectare
      </Button>

      <Credits className="mt-4 lg:hidden" />
    </div>
  );
}
