<template>
  <div>
    <h1>Home Page</h1>
    <p>{{ message }}</p>
    <button v-on:click="reverseMessage">Message retourné</button>
  </div>
</template>

<script src="./app-home.js"></script>
<style src="./app-home.css" scoped></style>