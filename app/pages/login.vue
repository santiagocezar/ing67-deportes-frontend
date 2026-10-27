<script setup lang="ts">
const auth = useAuth();

async function login(ev: SubmitEvent) {
    ev.preventDefault();

    console.log(ev);
    if (!(ev.target instanceof HTMLFormElement)) return;

    const data = new FormData(ev.target);

    await auth.login(
        data.get("email")?.toString() ?? "",
        data.get("password")?.toString() ?? "",
    );

    navigateTo(new URLSearchParams(location.search).get("target") ?? "/");
}
</script>

<template>
    <div class="root">
        <form
            class="p-6 card col-12 sm:col-8 md:col-6 vstack gap-4"
            action="#"
            @submit="login"
        >
            <h1 class="h4">Inicio de sesión</h1>
            <div class="form-field">
                <label for="email" class="form-label">Correo</label>
                <input
                    class="form-control form-control-lg"
                    type="email"
                    id="email"
                    name="email"
                />
            </div>
            <div class="form-field">
                <label for="password" class="form-label">Contraseña</label>
                <input
                    class="form-control form-control-lg"
                    type="password"
                    id="password"
                    name="password"
                />
            </div>
            <button
                class="btn-solid btn-styled btn-lg rounded-pill align-self-center theme-accent"
            >
                Iniciar sesión
            </button>
        </form>
    </div>
</template>

<style>
.root {
    height: 100%;
    padding: 1rem;
    align-content: center;

    & form {
        max-width: 400px;
        margin: 0 auto;
    }
}
</style>
