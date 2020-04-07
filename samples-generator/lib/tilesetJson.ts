import { AtLeastOne } from './atLeastN';
import { instancesRegion } from './constants';
import { TilesetOption } from './createTilesetJsonSingle';

type BoundingVolume = AtLeastOne<{
    region: number[];
    box: number[];
    sphere: number[];
}>;

export interface TilesetJson {
    asset: {
        version: string;
        tilesetVersion?: string;
    };
    properties?: {
        [propertyName: string]: {
            minimum: number;
            maximum: number;
        };
    };
    geometricError: number;
    root: {
        content?: {
            uri: string;
            boundingVolume?: {
                region: number[];
            };
        };
        children?: {
            boundingVolume: BoundingVolume;
            geometricError: number;
            transform?: number[];
            content: {
                uri: string;
            };
            extras?: {
                id: string;
            };
            viewerRequestVolume?: BoundingVolume;
        }[];
        geometricError: number;
        versionNumber?: string;
        region?: number[];
        box?: object;
        sphere?: object;
        transform?: number[];
        eastNorthUp?: boolean;
        expire?: any;
        refine: string;
        boundingVolume: BoundingVolume;
    };
    extensionsUsed?: string[];
    extensionsRequired?: string[];
    extensions?: object;
    extras?: {
        name?: string;
    };
}

export function getTilesetOpts(
    contentUri: string,
    geometricError: number,
    versionNumber: string,
    region: number[] = instancesRegion
): TilesetOption {
    return {
        contentUri: contentUri,
        geometricError: geometricError,
        versionNumber: versionNumber,
        region: region
    };
}
