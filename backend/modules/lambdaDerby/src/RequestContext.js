"use strict";

const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

function newStore() {
    return {
        entityFactory: null,
        errorList: [],
    };
}

function getStore() {
    return storage.getStore();
}

function getOrCreateStore() {
    const store = getStore();
    if (store) {
        return store;
    }

    const newContext = newStore();
    storage.enterWith(newContext);
    return newContext;
}

function run(callback) {
    return storage.run(newStore(), callback);
}

function reset() {
    const store = getOrCreateStore();
    store.entityFactory = null;
    store.errorList = [];
}

function setEntityFactory(entityFactory) {
    getOrCreateStore().entityFactory = entityFactory;
}

function getEntityFactory() {
    const entityFactory = getEntityFactoryOrNull();
    if (!entityFactory) {
        throw new Error("EntityFactory is not initialized for this request.");
    }
    return entityFactory;
}

function getEntityFactoryOrNull() {
    return getStore()?.entityFactory || null;
}

function getErrorList() {
    return getOrCreateStore().errorList;
}

function resetErrorList() {
    getOrCreateStore().errorList = [];
}

function pushError(error) {
    getOrCreateStore().errorList.push(error);
}

function withEntityFactory(entityFactory, callback) {
    const current = getOrCreateStore();
    return storage.run(
        {
            ...current,
            entityFactory,
        },
        callback
    );
}

module.exports = {
    run,
    reset,
    setEntityFactory,
    getEntityFactory,
    getEntityFactoryOrNull,
    getErrorList,
    resetErrorList,
    pushError,
    withEntityFactory,
};
