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
    <div class="container">
        <form class="box" action="#" @submit="login">
            <h1 class="title">Iniciar sesión</h1>
            <label class="field">
                <span class="label">Correo</span>
                <input class="input" type="email" name="email" />
            </label>
            <label class="field">
                <span class="label">Contraseña</span>
                <input class="input" type="password" name="password" />
            </label>
            <div class="block"></div>
            <button class="button is-primary">Login</button>
        </form>
    </div>
</template>
