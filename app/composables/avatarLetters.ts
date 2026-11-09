export const avatarLetters = (name: string) => {
    const letters = name
        .toUpperCase()
        .split(" ")
        .map((s) => s[0]);
    letters.splice(1, letters.length - 2);
    return letters.join("");
};
