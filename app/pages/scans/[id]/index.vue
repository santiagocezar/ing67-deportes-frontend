<script setup lang="ts">
import type {
    MatchRosterScanFaceResponse,
    MatchRosterScanManualReviewDecisionResponse,
    MatchRosterScanManualReviewResponse,
} from "~/utils/openapi";

import { IconArrowLeft, IconScanPerson } from "~/assets/icons";
import Header from "~/components/Header.vue";

const { data, pending, error, scan, match, competition, team } =
    await useScanDetail();
const { groupImageUrl, groupImagePending, groupImageError, crops } =
    useScanGroupImage(scan);
const { canResolve, blockedReason } = await useManualReviewAccess(scan, match);

const unknownFaceCount = computed(
    () => scan.value?.faces.filter((face) => face.status === "unknown").length,
);

const countWarning = computed(() => {
    if (!scan.value?.count_warning) return "";

    return scan.value.count_warning === "recognized_player_count_below_expected"
        ? "Se reconocieron menos jugadores de los esperados."
        : "Se reconocieron más jugadores de los esperados.";
});

function statusLabel(status: MatchRosterScanManualReviewResponse["status"]) {
    return {
        pending: "Pendiente",
        resolved: "Resuelta",
        expired: "Vencida",
    }[status];
}

function statusTheme(status: MatchRosterScanManualReviewResponse["status"]) {
    return {
        pending: "theme-warning",
        resolved: "theme-success",
        expired: "theme-secondary",
    }[status];
}

function faceStatusLabel(status: MatchRosterScanFaceResponse["status"]) {
    return {
        declared_eligible: "Habilitado",
        declared_sanctioned: "Sancionado",
        team_member_undeclared: "No declarado",
        team_member_undeclared_sanctioned: "No declarado y sancionado",
        unknown: "Sin coincidencia",
    }[status];
}

function faceStatusTheme(status: MatchRosterScanFaceResponse["status"]) {
    return {
        declared_eligible: "theme-success",
        declared_sanctioned: "theme-danger",
        team_member_undeclared: "theme-warning",
        team_member_undeclared_sanctioned: "theme-danger",
        unknown: "theme-secondary",
    }[status];
}

function outcomeLabel(
    outcome: MatchRosterScanManualReviewDecisionResponse["outcome"],
) {
    return {
        belongs_to_team: "Pertenece al equipo",
        does_not_belong_to_team: "No pertenece al equipo",
        inconclusive: "Inconcluso",
    }[outcome];
}
</script>

<template>
    <Header title="Revisión" />

    <div class="container p-4">
        <NuxtLink
            class="d-flex align-items-center gap-1 text-decoration-none mb-3"
            :to="{ name: 'scans' }"
        >
            <IconArrowLeft />
            <span>Volver a revisiones</span>
        </NuxtLink>

        <div class="d-flex align-items-center gap-2 fg-2" v-if="pending">
            <span
                class="spinner-border spinner-border-sm"
                aria-hidden="true"
            ></span>
            Cargando revisión…
        </div>

        <div class="alert theme-danger" role="alert" v-else-if="error">
            No se pudo cargar la revisión.
        </div>

        <template v-else-if="data && scan && match && competition">
            <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
                <div class="flex-grow-1">
                    <h1 class="h2 fw-light mb-1">
                        Revisión de {{ team?.name ?? "equipo" }}
                    </h1>
                    <p class="fg-2 mb-0">
                        <NuxtLink
                            :to="{
                                name: 'home-sport-competitions-id-matches-matchId',
                                params: {
                                    sport: competition.sport.id,
                                    id: competition.id,
                                    matchId: match.id,
                                },
                            }"
                        >
                            {{ match.team_1.name }} vs.
                            {{ match.team_2.name }} ·
                            {{ match.competition.name }} de
                            {{ competition.sport.name }}
                        </NuxtLink>
                    </p>
                </div>
                <span
                    v-if="scan.manual_review"
                    class="badge badge-subtle"
                    :class="statusTheme(scan.manual_review.status)"
                >
                    {{ statusLabel(scan.manual_review.status) }}
                </span>
            </div>
            <hr />

            <div class="grid grid-cols-1 md:grid-cols-2">
                <div>
                    <section
                        class="card"
                        :class="
                            countWarning ? 'theme-warning' : 'theme-primary'
                        "
                    >
                        <div class="card-header">Resultado del escaneo</div>
                        <div class="card-body">
                            <div class="fw-semibold">
                                <span v-if="countWarning">
                                    {{ countWarning }}
                                </span>
                                <span v-else>
                                    La cantidad de jugadores es correcta
                                </span>
                            </div>

                            <dl
                                class="grid gap-0 small"
                                style="grid-template-columns: 1fr auto"
                            >
                                <dt class="fg-2">Esperados</dt>
                                <dd class="">
                                    {{ scan.expected_players }}
                                </dd>
                                <dt class="fg-2">Reconocidos</dt>
                                <dd class="">
                                    {{ scan.unique_recognized_players }}
                                </dd>
                                <dt class="fg-2">Caras detectadas</dt>
                                <dd class="">
                                    {{ scan.detected_faces }}
                                </dd>
                                <dt class="fg-2">Sin identificar</dt>
                                <dd class="">
                                    {{ unknownFaceCount }}
                                </dd>
                            </dl>

                            <p class="fg-2 small mb-0 mt-2">
                                Escaneo del
                                {{ formatDateTime(scan.created_at) }}
                            </p>
                        </div>
                    </section>
                    <section class="mt-4">
                        <h2 class="h4 mb-4">Foto grupal</h2>
                        <div
                            v-if="scan.manual_review?.status !== 'pending'"
                            class="fg-2 mb-0"
                        >
                            No disponible para revisiones resueltas.
                        </div>
                        <div
                            v-else-if="groupImagePending"
                            class="d-flex align-items-center gap-2 fg-2"
                        >
                            <span
                                class="spinner-border spinner-border-sm"
                                aria-hidden="true"
                            ></span>
                            Cargando imagen…
                        </div>
                        <div
                            v-else-if="groupImageError"
                            class="alert theme-danger mb-0"
                            role="alert"
                        >
                            No se pudo cargar la imagen grupal.
                        </div>
                        <img
                            v-else-if="groupImageUrl"
                            class="group-image"
                            :src="groupImageUrl"
                            alt="Foto grupal retenida del equipo"
                        />
                    </section>
                </div>
                <div>
                    <section>
                        <h2 class="h4 mb-4">Caras detectadas</h2>

                        <p v-if="!scan.faces.length" class="fg-2">
                            El escaneo no detectó caras.
                        </p>

                        <div class="vstack gap-2" v-else>
                            <article
                                v-for="face in scan.faces"
                                :key="face.face_index"
                                class="card"
                            >
                                <div class="card-body gap-3">
                                    <div class="hstack">
                                        <img
                                            v-if="crops[face.face_index]"
                                            class="avatar me-4 avatar-xl object-fit-cover"
                                            style="border: none"
                                            :src="crops[face.face_index]"
                                            :alt="
                                                face.player_name ??
                                                'Jugador no identificado'
                                            "
                                        />
                                        <div v-else class="avatar me-4">
                                            {{
                                                avatarLetters(
                                                    face.player_name ?? "?",
                                                )
                                            }}
                                        </div>
                                        <div class="flex-grow-1">
                                            <div
                                                class="d-flex flex-wrap align-items-center gap-2 row-gap-0"
                                            >
                                                <p
                                                    class="fw-semibold mb-0 flex-grow-1"
                                                >
                                                    {{
                                                        face.player_name ??
                                                        "Jugador no identificado"
                                                    }}
                                                    <span
                                                        class="fg-2 fw-light small"
                                                    >
                                                        · Cara
                                                        {{
                                                            face.face_index + 1
                                                        }}
                                                    </span>
                                                </p>
                                                <span
                                                    class="badge badge-subtle"
                                                    :class="
                                                        faceStatusTheme(
                                                            face.status,
                                                        )
                                                    "
                                                >
                                                    {{
                                                        faceStatusLabel(
                                                            face.status,
                                                        )
                                                    }}
                                                </span>
                                            </div>

                                            <p
                                                v-if="
                                                    face.match_percentage !==
                                                    null
                                                "
                                                class="fg-2 small mb-1"
                                            >
                                                {{ face.match_percentage }}% de
                                                coincidencia
                                            </p>
                                        </div>
                                    </div>
                                    <ul
                                        v-if="face.sanctions.length"
                                        class="sanctions small mb-0"
                                    >
                                        <li
                                            v-for="sanction in face.sanctions"
                                            :key="sanction.sanction_id"
                                        >
                                            <strong>{{
                                                sanction.title
                                            }}</strong>
                                            — {{ sanction.reason }} ({{
                                                sanction.remaining_matches
                                            }}
                                            {{
                                                sanction.remaining_matches === 1
                                                    ? "partido"
                                                    : "partidos"
                                            }})
                                        </li>
                                    </ul>
                                </div>
                            </article>
                        </div>
                    </section>

                    <section
                        v-if="scan.manual_review?.status === 'pending'"
                        class="card mt-4"
                    >
                        <div class="card-header">
                            <h2 class="h5 mb-0 hstack gap-2">
                                <IconScanPerson />
                                Resolver revisión
                            </h2>
                        </div>
                        <div
                            class="card-body d-flex flex-wrap align-items-center gap-2"
                        >
                            <p
                                v-if="canResolve"
                                class="fg-2 small mb-0 flex-grow-1"
                            >
                                Indicá qué hacer con cada cara que el escaneo no
                                pudo identificar. La revisión se guarda una sola
                                vez.
                            </p>
                            <p v-else class="fg-2 small mb-0 flex-grow-1">
                                {{ blockedReason }}
                            </p>
                            <NuxtLink
                                v-if="canResolve"
                                class="btn-solid theme-primary"
                                :to="{
                                    name: 'scans-id-resolve',
                                    params: { id: scan.id },
                                }"
                            >
                                <IconScanPerson />
                                <span>Resolver revisión</span>
                            </NuxtLink>
                        </div>
                    </section>

                    <section
                        v-if="scan.manual_review"
                        class="card mt-4"
                        aria-labelledby="manual-review-title"
                    >
                        <div class="card-header">
                            <h2 id="manual-review-title" class="h5 mb-0">
                                Revisión manual
                            </h2>
                        </div>
                        <div class="card-body">
                            <p class="fg-2 small">
                                {{
                                    scan.manual_review.status === "expired"
                                        ? "Venció"
                                        : "Vence"
                                }}
                                el
                                {{
                                    formatDateTime(
                                        scan.manual_review.expires_at,
                                    )
                                }}
                                <template v-if="scan.manual_review.resolved_at">
                                    · Resuelta el
                                    {{
                                        formatDateTime(
                                            scan.manual_review.resolved_at,
                                        )
                                    }}
                                </template>
                            </p>

                            <ul
                                v-if="scan.manual_review.decisions.length"
                                class="list-group list-group-flush"
                            >
                                <li
                                    v-for="decision in scan.manual_review
                                        .decisions"
                                    :key="decision.face_index"
                                    class="list-group-item px-0 d-flex flex-wrap align-items-center gap-2"
                                >
                                    <strong
                                        >Cara {{ decision.face_index }}</strong
                                    >
                                    <span
                                        class="badge badge-subtle theme-secondary"
                                    >
                                        {{ outcomeLabel(decision.outcome) }}
                                    </span>
                                    <span
                                        v-if="decision.player_name"
                                        class="fg-2"
                                    >
                                        {{ decision.player_name }}
                                    </span>
                                    <small class="fg-2 ms-auto">
                                        {{
                                            formatDateTime(decision.created_at)
                                        }}
                                    </small>
                                </li>
                            </ul>

                            <p v-else class="fg-2 mb-0">
                                Todavía no hay decisiones registradas.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.group-image {
    display: block;
    width: 100%;
    max-height: 24rem;
    border-radius: 0.5rem;
    object-fit: contain;
}

.sanctions {
    padding-left: 1rem;
}
</style>
