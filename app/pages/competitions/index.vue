<script setup lang="ts">
import {
	type CompetitionListResponse,
	type SportListResponse,
} from "~/utils/openapi";

import Options from "~icons/fluent/options-48-filled";
import Search from "~icons/fluent/search-48-filled";
import Add from "~icons/fluent/add-circle-48-filled";

type Competition = CompetitionListResponse["competitions"][number];
type CompetitionStatus = NonNullable<Competition["status"]>;
type LifecycleStatus = CompetitionStatus | "";
type Availability = "enabled" | "disabled" | "all";
type CompetitionSort = "starts_at_asc" | "starts_at_desc";
type Gender = Competition["gender"];

const filters = reactive({
	search: "",
	sport_id: "" as number | "",
	gender: "" as Gender | "",
	lifecycle_status: "" as LifecycleStatus,
	availability: "enabled" as Availability,
	sort: "starts_at_desc" as CompetitionSort,
	page: 1,
});

const competitionsQuery = computed(() => {
	const query: Record<string, string | number> = {
		availability: filters.availability,
		sort: filters.sort,
		page: filters.page,
	};

	if (filters.search.trim()) query.search = filters.search.trim();
	if (filters.sport_id) query.sport_id = filters.sport_id;
	if (filters.gender) query.gender = filters.gender;
	if (filters.lifecycle_status)
		query.lifecycle_status = filters.lifecycle_status;

	return query;
});

const { data } = await useAPI<CompetitionListResponse>("/competitions", {
	query: competitionsQuery,
});

const { data: sportsData } = await useAPI<SportListResponse>("/sports");

function genderLabel(gender: Gender) {
	return gender === "male" ? "Masculino" : "Femenino";
}

function statusLabel(status: CompetitionStatus) {
	return {
		scheduled: "Programada",
		in_progress: "En curso",
		finished: "Finalizada",
		discarded: "Descartada",
	}[status];
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString();
}

// Cambiar un filtro vuelve a la primera página del listado.
watch(
	() => [
		filters.search,
		filters.sport_id,
		filters.gender,
		filters.lifecycle_status,
		filters.availability,
		filters.sort,
	],
	() => {
		filters.page = 1;
	},
);

function goToPage(page: number) {
	filters.page = page;
}
</script>

<template>
	<div class="container p-4">
		<div class="is-flex is-align-items-center mb-3">
			<p class="title is-5 mb-0">Competencias</p>
			<div class="is-flex-grow-1"></div>
			<a class="button is-primary" href="/competitions/new">
				<span class="icon is-small">
					<Add />
				</span>
				<span>Agregar competencia</span>
			</a>
		</div>

		<form class="mb-3 search is-flex" action="#" @submit.prevent>
			<p class="control has-icons-left is-flex-grow-1">
				<input class="input" v-model="filters.search" type="search" placeholder="Buscar por nombre" />
				<span class="icon is-left">
					<Search />
				</span>
			</p>

			<button class="button" type="button" popovertarget="more-filters">
				<Options />
			</button>

			<dialog popover id="more-filters" class="card container my-auto p-4 is-primary">
				<label class="field">
					<span class="label">Deporte</span>
					<div class="select">
						<select v-model="filters.sport_id">
							<option value="">Todos</option>
							<option v-for="sport in sportsData?.sports" :key="sport.id" :value="sport.id">
								{{ sport.name }}
							</option>
						</select>
					</div>
				</label>
				<label class="field">
					<span class="label">Género</span>
					<div class="select">
						<select v-model="filters.gender">
							<option value="">Todos</option>
							<option value="male">Masculino</option>
							<option value="female">Femenino</option>
						</select>
					</div>
				</label>
				<label class="field">
					<span class="label">Estado del ciclo</span>
					<div class="select">
						<select v-model="filters.lifecycle_status">
							<option value="">Todos</option>
							<option value="scheduled">Programada</option>
							<option value="in_progress">En curso</option>
							<option value="finished">Finalizada</option>
							<option value="discarded">Descartada</option>
						</select>
					</div>
				</label>
				<label class="field">
					<span class="label">Disponibilidad</span>
					<div class="select">
						<select v-model="filters.availability">
							<option value="enabled">Habilitadas</option>
							<option value="disabled">Deshabilitadas</option>
							<option value="all">Todas</option>
						</select>
					</div>
				</label>
				<label class="field">
					<span class="label">Orden</span>
					<div class="select">
						<select v-model="filters.sort">
							<option value="starts_at_desc">
								Comienzo (más recientes)
							</option>
							<option value="starts_at_asc">
								Comienzo (más antiguas)
							</option>
						</select>
					</div>
				</label>
			</dialog>
		</form>

		<div class="competition-grid" v-if="data">
			<a class="cell competition card" v-for="competition in data.competitions"
				:href="`/competitions/${competition.id}`" :key="competition.id">
				<header class="card-header">
					<p class="card-header-title">
						<span class="pr-2">
							{{ competition.name }}
						</span>
					<div class="is-flex-grow-1"></div>
					<span class="tag">
						{{ competition.is_enabled ? statusLabel(competition.status) : "Deshabilitada" }}
					</span>
					</p>
				</header>
				<div class="card-content pl-4 pb-4 pr-4 pt-0">

					<p>
						Desde
						<strong>
							{{ formatDate(competition.starts_at) }}
						</strong>
						hasta
						<strong>
							{{ formatDate(competition.ends_at) }}
						</strong>
					</p>
					<p>
						<span class="has-text-weight-light">
							{{ competition.sport.name }}
							{{ genderLabel(competition.gender) }}
						</span>

					</p>
				</div>
			</a>
		</div>
		<p v-else>Hubo un problema para cargar los datos</p>

		<nav class="pagination" v-if="data && data.pagination.total_pages > 1">
			<button class="pagination-previous" :disabled="data.pagination.page <= 1"
				@click="goToPage(data.pagination.page - 1)">
				Anterior
			</button>
			<button class="pagination-next" :disabled="data.pagination.page >= data.pagination.total_pages"
				@click="goToPage(data.pagination.page + 1)">
				Siguiente
			</button>
			<p class="pagination-list">
				Página {{ data.pagination.page }} de
				{{ data.pagination.total_pages }} ({{
					data.pagination.total_items
				}}
				competencias)
			</p>
		</nav>
	</div>
</template>

<style>
.search {
	display: flex;
	gap: 1rem;

	.control {
		flex-grow: 1;
	}
}

#more-filters {
	&:popover-open {
		display: grid;
	}

	grid-template-columns: auto 1fr;
	gap: 0.5rem;

	& .label {
		text-align: right;
		margin: 0;
	}

	& .field {
		display: grid;
		grid-column: span 2;
		grid-template-columns: subgrid;
		justify-items: stretch;
		align-items: center;
	}
}

.competition {
	height: 100%;
}

.competition-grid {
	display: grid;
	gap: 0.5rem;
	grid-template-columns: repeat(auto-fill, minmax(24rem, 1fr));
}
</style>
