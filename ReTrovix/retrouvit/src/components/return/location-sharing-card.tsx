"use client";

import * as React from "react";
import { returnsApi, type LocationShareResponse } from "@/lib/api-returns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin, ExternalLink, Loader2, EyeOff } from "lucide-react";

/**
 * Partage de position — §13 / §20.
 *
 * - Visible uniquement pendant la fenêtre de mission
 *   (MISSION_STARTED → MEETING_IN_PROGRESS → HANDOVER_PENDING) ;
 * - La position de l'autre partie est rafraîchie par polling toutes les 15 s ;
 * - Le partage de MA position est opt-in (bouton « Partager ma position ») ;
 * - Hors fenêtre (mission non démarrée ou restitution terminée), la position
 *   est masquée — le composant n'affiche rien du tout (§20 : purge côté
 *   serveur, rien à exposer).
 *
 * Confidentialité : la position n'est envoyée au backend que lorsque
 * l'utilisateur clique sur le bouton, et uniquement pendant la mission
 * (le backend refuse sinon).
 */

const POLL_INTERVAL_MS = 15_000;

/** Distance à vol d'oiseau (formule haversine), en km. */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "il y a quelques secondes";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

const SHARING_WINDOW_STATUSES = new Set([
  "MISSION_STARTED",
  "MEETING_IN_PROGRESS",
  "HANDOVER_PENDING",
]);

interface LocationSharingCardProps {
  returnId: number;
  status: string;
  /** true si l'utilisateur courant est le Chercheur (loser). */
  isLoser: boolean;
  /** true si l'utilisateur courant est le Finder. */
  isFinder: boolean;
  /** Déclenché après un « Je suis arrivé » (Finder). */
  onArrived?: () => void;
  arrivalLoading?: boolean;
}

export function LocationSharingCard({
  returnId,
  status,
  isLoser,
  isFinder,
  onArrived,
  arrivalLoading,
}: LocationSharingCardProps) {
  const [peerLocation, setPeerLocation] = React.useState<LocationShareResponse | null>(null);
  const [myLocation, setMyLocation] = React.useState<LocationShareResponse | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [locError, setLocError] = React.useState<string | null>(null);
  const [sharingEnabled, setSharingEnabled] = React.useState(false);

  const inWindow = SHARING_WINDOW_STATUSES.has(status);

  // ─── Polling de la position de l'autre partie (§13) ────────
  React.useEffect(() => {
    if (!inWindow) {
      setPeerLocation(null);
      setMyLocation(null);
      return;
    }
    let cancelled = false;
    const fetchPeer = async () => {
      try {
        const data = await returnsApi.getPeerLocation(returnId);
        if (!cancelled) setPeerLocation(data);
      } catch {
        /* silencieux : la position peut ne pas encore exister */
      }
    };
    fetchPeer();
    const timer = setInterval(fetchPeer, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [returnId, inWindow, status]);

  // ─── Partage de ma position (opt-in, §13) ──────────────────
  const startSharing = React.useCallback(() => {
    setLocError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        returnsApi
          .updateLocation(returnId, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
          })
          .then((data) => {
            setMyLocation(data);
            setSharingEnabled(true);
          })
          .catch((err) =>
            setLocError(
              err instanceof Error ? err.message : "Partage de position impossible"
            )
          )
          .finally(() => setLocating(false));
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Permission de géolocalisation refusée."
            : "Position GPS indisponible."
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000 }
    );
  }, [returnId]);

  // ─── Rendu ──────────────────────────────────────────────────

  // §20 : hors fenêtre → rien (position masquée, purge côté serveur)
  if (!inWindow) return null;

  const peer = peerLocation?.user;
  const hasPeerPosition =
    peerLocation?.sharingActive &&
    peerLocation.latitude != null &&
    peerLocation.longitude != null;
  const myDistanceKm =
    hasPeerPosition &&
    myLocation?.latitude != null &&
    myLocation?.longitude != null
      ? haversineKm(
          myLocation.latitude,
          myLocation.longitude,
          peerLocation!.latitude!,
          peerLocation!.longitude!
        )
      : null;

  const mapUrl =
    hasPeerPosition
      ? `https://www.openstreetmap.org/?mlat=${peerLocation!.latitude}&mlon=${peerLocation!.longitude}#map=15/${peerLocation!.latitude}/${peerLocation!.longitude}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Localisation en direct
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Position de l'autre partie */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          {hasPeerPosition && peer ? (
            <>
              <p className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Position de {peer.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Mise à jour {peerLocation!.updatedAt ? timeAgo(peerLocation!.updatedAt) : ""}
                {myDistanceKm != null && ` — distance estimée : ${myDistanceKm.toFixed(1)} km`}
              </p>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Voir sur la carte <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Position de {peer?.name ?? "l'autre partie"} non encore partagée.
            </p>
          )}
        </div>

        {/* Partage de ma position — opt-in */}
        {(isLoser || isFinder) && (
          <div className="space-y-2">
            {!sharingEnabled ? (
              <Button
                variant="outline"
                onClick={startSharing}
                disabled={locating}
                className="w-full"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-1" />
                )}
                Partager ma position
              </Button>
            ) : (
              <p className="text-xs text-green-600 dark:text-green-400 text-center">
                ✅ Votre position est partagée — mise à jour à chaque visite de cette page.
              </p>
            )}
            {locError && (
              <p className="text-xs text-destructive text-center">{locError}</p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          🔒 Le partage s&apos;arrêtera automatiquement à la fin de la restitution.
        </p>

        {/* « Je suis arrivé » — Finder (§14) */}
        {isFinder && onArrived && status === "MISSION_STARTED" && (
          <Button onClick={onArrived} disabled={arrivalLoading} className="w-full">
            <MapPin className="h-4 w-4 mr-1" />
            Je suis arrivé
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
