'use strict';

export default {
    name: "AppHome",
    data: function() {
        return {
            message: 'Hello Vue !'
        };
    },
    methods: {
        reverseMessage: function() {
            let newMsg = this.message.split('').reverse().join('');
            this.message = newMsg;
        }
    }
};