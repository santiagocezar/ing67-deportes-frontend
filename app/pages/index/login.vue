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

    navigateTo("/");
}
</script>

<template>
    <form action="#" @submit="login">
        <input type="email" name="email" />
        <input type="password" name="password" />
        <button>Login</button>
    </form>
</template>
