import UndoManager from 'undo-manager';
import * as _ from 'lodash';
import {BabylonViewerComponent} from '../babylon-viewer/babylon-viewer.component';

const undoManagerMap = {};

export const UndoMgr: UndoManager = undoFactory('default');


/**
 * @param name
 * @returns {*}
 */

export function undoFactory(name: string) {
    if (undoManagerMap[name]) {
        return undoManagerMap[name];
    }

    const undoManager =  new UndoManager();

    const mLimit = 99;
    undoManager.getLimit = () => mLimit;

    undoManager.setLimit(mLimit);
    const mUndoMgr = {
        setMaterialProperty: function (viewer: BabylonViewerComponent, meshName: string, propertyName: string, propertyValue: any) {
            const material = <BABYLON.PBRMaterial>viewer.getMesh(meshName).material;
            let lastVal: any = material.albedoColor.toHexString();
            switch (propertyName) {
                case 'color':
                    lastVal = material.albedoColor.toHexString();
                    break;
                case 'texture':
                    lastVal = material.albedoTexture;
                    break;
            }
            this.add({
                undo: function () {
                    console.log('undo', meshName, propertyName, propertyValue);
                    // FIXME this will reset material to starting material
                    // viewer.resetMaterialProperty(meshName, propertyName);
                    viewer.setMeshMaterialProperty(meshName, propertyName, lastVal);
                },
                redo: function () {
                    console.log('redo', meshName, propertyName, propertyValue);
                    viewer.setMeshMaterialProperty(meshName, propertyName, propertyValue);
                }
            });
        },
        setMaterialTexture: function (viewer: BabylonViewerComponent, meshName: string, propertyValue: any) {


            const oldMaterial = <BABYLON.PBRMaterial>viewer.getMesh(meshName).material;

            this.add({
                undo: function () {
                    console.log('undo', meshName, propertyValue);
                    viewer.getMesh(meshName).material = oldMaterial;
                    console.log(oldMaterial);
                },
                redo: function () {
                    console.log('redo', meshName, propertyValue);
                    viewer.changeMeshMaterial(meshName, propertyValue);
                    console.log(oldMaterial);
                }
            });
        },
        /**
         * Puts attribute changes of a HTMLElement onto the undo stack.
         * @param {HTMLElement} el - The target for the undo/redo.
         * @param {object} attributes - A map containing attributes that should be changed via setAttribute.
         * @param {object} [oldAttributes] - A map containing attributes that will be used for the undo step.
         *                                   Note: If left undefined, 'oldAttributes' will be retrieved from the 'attributes' keys.
         */
        addHTMLAttributes: function (el, attributes, oldAttributes) {
            if (!oldAttributes) {
                oldAttributes = _.mapValues(attributes, (attr, key) => el.getAttribute(key));
            }

            const addAttrs = (_attributes) =>
                () => _.each(_attributes, (attr, key) =>
                    (attr != null) ? el.setAttribute(key, attr) : el.removeAttribute(key));
            this.add({
                redo: addAttrs(attributes),
                undo: addAttrs(oldAttributes)

            });
        },
        add: function ({undo, redo}) {
            if (!undo) {
                throw new Error('undo not defined');
            }
            if (!redo) {
                throw new Error('redo not defined');
            }

            undoManager.add({undo, redo});

            // call the method once
            redo();
        },
        undo: () => undoManager.undo(),
        redo: () => undoManager.redo(),
        getInstance: () => undoManager
    };

    undoManagerMap[name] = mUndoMgr;

    return mUndoMgr;
}
