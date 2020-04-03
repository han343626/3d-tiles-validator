import { GeneratorArgs } from './arguments';
import {
    latitude,
    longitude,
    outputDirectory,
    tilesNextTilesetJsonVersion,
    wgs84Transform
} from './constants';
import * as path from 'path';
import { TilesNextExtension } from './tilesNextExtension';
import { Gltf } from './gltfType';
import { writeTile } from './ioUtil';

const Cesium = require('cesium');
const fsExtra = require('fs-extra');
const Matrix4 = Cesium.Matrix4;
const gltfPipeline = require('gltf-pipeline');
const glbToGltf = gltfPipeline.glbToGltf;
const saveJson  = require('./saveJson');

export namespace SamplesNext {
    export async function createDiscreteLOD(args: GeneratorArgs) {
        const ext = args.useGlb
            ? TilesNextExtension.Glb
            : TilesNextExtension.Gltf;

        const glbPaths = [
            'data/dragon_high.glb',
            'data/dragon_medium.glb',
            'data/dragon_low.glb'
        ];
        const tileNames = ['dragon_high', 'dragon_medium', 'dragon_low'];
        const tilesetName = 'TilesetWithDiscreteLOD';
        const tilesetDirectory = path.join(
            outputDirectory,
            'Samples',
            tilesetName
        );
        const tilesetPath = path.join(tilesetDirectory, 'tileset.json');

        const dragonWidth = 14.191;
        const dragonHeight = 10.075;
        const dragonDepth = 6.281;
        const dragonBox = [
            0.0,
            0.0,
            0.0, // center
            dragonWidth / 2.0,
            0.0,
            0.0, // width
            0.0,
            dragonDepth / 2.0,
            0.0, // depth
            0.0,
            0.0,
            dragonHeight / 2.0 // height
        ];

        const dragonScale = 100.0;
        const dragonOffset = (dragonHeight / 2.0) * dragonScale;
        const wgs84Matrix = wgs84Transform(longitude, latitude, dragonOffset);
        const scaleMatrix = Matrix4.fromUniformScale(dragonScale);
        const dragonMatrix = Matrix4.multiply(
            wgs84Matrix,
            scaleMatrix,
            new Matrix4()
        );
        const dragonTransform = Matrix4.pack(dragonMatrix, new Array(16));

        // At runtime a tile's geometric error is scaled by its computed scale.
        // This doesn't apply to the top-level geometric error.
        const dragonLowGeometricError = 5.0;
        const dragonMediumGeometricError = 1.0;
        const dragonHighGeometricError = 0.1;
        const dragonTilesetGeometricError =
            dragonLowGeometricError * dragonScale;

        const tilesetJson = {
            asset: {
                version: tilesNextTilesetJsonVersion
            },
            geometricError: dragonTilesetGeometricError,
            root: {
                transform: dragonTransform,
                boundingVolume: {
                    box: dragonBox
                },
                geometricError: dragonMediumGeometricError,
                refine: 'REPLACE',
                content: {
                    uri: 'dragon_low' + ext
                },
                children: [
                    {
                        boundingVolume: {
                            box: dragonBox
                        },
                        geometricError: dragonHighGeometricError,
                        content: {
                            uri: 'dragon_medium' + ext
                        },
                        children: [
                            {
                                boundingVolume: {
                                    box: dragonBox
                                },
                                geometricError: 0.0,
                                content: {
                                    uri: 'dragon_high' + ext
                                }
                            }
                        ]
                    }
                ]
            }
        };

        const gltfs: Gltf[] = [];
        for (let i=0; i < glbPaths.length; ++i) {
            const glbPath = glbPaths[i];
            const glb = await fsExtra.readFile(glbPath);
            const gltf = (await glbToGltf(glb)).gltf as Gltf;
            gltfs.push(gltf);
        }

        await saveJson(tilesetPath, tilesetJson, args.prettyJson, args.gzip);

        for (let i=0; i < tileNames.length; ++i) {
            const name = tileNames[i] + ext;
            const gltf = gltfs[i];
            await writeTile(tilesetDirectory, name, gltf, args);
        }
    }

    export async function createTreeBillboards(args: GeneratorArgs) {}

    export async function createRequestVolume(args: GeneratorArgs) {}

    export async function createExpireTileset(args: GeneratorArgs) {}
}
