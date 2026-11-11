<script setup lang="ts">
import {
    IconHome,
    IconHomeActive,
    IconPeople,
    IconPeopleActive,
    IconScanPersonActive,
    IconScanPersonRegular,
    IconShield,
    IconShieldActive,
} from "~/assets/icons";

const route = useRoute();

const { isAdministrator } = useCurrentUser();

const sportId = computed(() => route.params.sport);

// El catálogo de equipos es solo para administradores, así que para el resto
// ni siquiera se ofrece el acceso desde la navegación.
const routes = computed(() => [
    {
        icon: IconHome,
        iconActive: IconHomeActive,
        to: `/home/${sportId.value}`,
        label: "Inicio",
    },
    {
        icon: IconPeople,
        iconActive: IconPeopleActive,
        to: `/home/${sportId.value}/players`,
        label: "Jugadores",
    },
    ...(isAdministrator.value
        ? [
              {
                  icon: IconShield,
                  iconActive: IconShieldActive,
                  to: `/home/${sportId.value}/teams`,
                  label: "Equipos",
              },
          ]
        : []),
    {
        icon: IconScanPersonRegular,
        iconActive: IconScanPersonActive,
        to: "/scans",
        label: "Revisiones",
    },
]);

const active = computed(() => {
    let score = 0;
    let path = "";
    for (const r of routes.value) {
        if (route.path.startsWith(r.to) && r.to.length >= score) {
            path = r.to;
            score = path.length;
        }
    }
    return path;
});
</script>

<template>
    <slot></slot>
    <div
        class="sticky-bottom p-4 md:p-6 mt-auto mx-auto z-sticky"
        v-if="sportId"
    >
        <nav class="shadow-xl card card-translucent">
            <ul class="m-0 card-body nav-buttons">
                <NavItem
                    v-for="{ icon, iconActive, to, label } in routes"
                    :key="to"
                    :icon
                    :iconActive
                    :to
                    :active="to === active"
                >
                    {{ label }}
                </NavItem>
            </ul>
        </nav>
    </div>
</template>

<style lang="css" scoped>
.nav-buttons {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
}
</style>
