import {StyleSheet, Dimensions, Platform} from 'react-native';
import {StatusBarHeight} from '../services';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

const CAM_PREVIEW_WIDTH = Dimensions.get('window').width;
const CAM_PREVIEW_HEIGHT = CAM_PREVIEW_WIDTH / (Platform.OS === 'ios' ? 9 / 16 : 3 / 4);

export const styles = StyleSheet.create({
    imageContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.5,
    },
    imageLogo: {
        width: width / 3,
        height: width / 3,
        marginBottom: 64,
    },
    imageLogoBtn: {
        width: width / 5,
        height: width / 5,
        marginBottom: 12,
        borderRadius: 16,
    },
    button: {
        width: width - 32,
        backgroundColor: 'green',
        color: 'red',
        marginBottom: 32,
        paddingVertical: 16,
        borderRadius: 8,
        maxWidth: 600,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        textAlign: 'center',
        color: 'black',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    appName: {
        fontWeight: 'bold',
        fontSize: 36,
        marginBottom: 16,
        color: 'white',
    },
    selectName: {
        fontWeight: '600',
        fontSize: 20,
        marginBottom: 32,
        color: 'white',
    },
    isTfReady: {
        position: 'absolute',
        bottom: 16,
        fontSize: 13,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        position: 'absolute',
        width: '100%',
        height: '100%',
        alignContent: 'center',
        zIndex: 9999,
        backgroundColor: '#80808073',
    },
    cameraContainer: {
        position: 'relative',
        zIndex: 1,
        //top: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
        backgroundColor: 'white',
        display: 'flex',
        // justifyContent: 'center',
        // alignItems: 'center',
        flexDirection: 'column',
        marginTop: 50
    },
    camera: {
        width: width,
        height: width * 4 / 3,
        // width: 300,
        // height: 300,
        // position: 'absolute',
        top: 0,
        zIndex: 1,
        // left: 0,
    },
    btnBackWrapper: {
        position: 'absolute',
        top: StatusBarHeight,
        left: 0,
        width: 64,
        height: 64,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        // backgroundColor: 'red',
    },
    btnBack: {
        backgroundColor: 'green',
        width: 28,
        height: 28,
        borderRadius: 32 / 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    btnBackIcon: {
        marginLeft: -1,
        marginTop: 1,
    },
    btnBackText: {},
    boxes: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        zIndex: 20,
    },
    box: {
        position: 'absolute',
        borderColor: 'blue',
        borderRadius: 8,
        borderWidth: 2,
    },
    boxText: {
        margin: 8,
        fontSize: 15, fontWeight: '500',
    },
    text: {
        color: 'blue',
        margin: 16,
    },
    buttonIcon: {
        position: 'absolute', left: 16,
        marginVertical: 'auto',
    },
    cameraText: {
        width: '50%',
        paddingHorizontal: 16,
        marginTop: 16, fontSize: 16, fontWeight: '500',
    },
    textRight: {
        textAlign: 'right',
    },
});
