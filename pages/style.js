import {StyleSheet} from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

export default styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        flexWrap: 'wrap',
        flexDirection: 'row'
     },
     darkBg:{
flex:1,
backgroundColor:"#000",
width:wp('100%')
     },
     topCover: {
        position: 'absolute',
        paddingTop:10,
        top: 1,
        padding: 1,
        width: wp('95%'),
        height: hp('15%'),
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        alignSelf:'center'
  
     },
     topCoverBlack: {
      position: 'absolute',
      paddingTop:10,
      top: 1,
      padding: 1,
      width: wp('95%'),
      height: hp('15%'),
      backgroundColor: '#000000',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      alignSelf:'center'

   },
     topLeft: {
        width: 80,
        height: 80,
        borderRadius: 100,
        borderWidth: 0,
        borderStyle: 'solid',
        borderColor: '#e6e6e6',
        backgroundColor: '#ffffff',
       flexDirection:'row',
        alignItems: 'center',
        justifyContent:'center',
        alignSelf:'center',
        marginTop:13,
        marginLeft:30,

     },
     leftLogo: {
        width: 35,
        height: 35,
        alignItems: 'center',
        resizeMode: 'contain',
        margin: 5,
     },
     topRight: {
        padding: 6,
        width: wp('58%'),
        height: hp('14%'),
        margin: 1,
        borderRadius: 3,
        borderWidth: 0,
        borderStyle: 'solid',
        borderColor: '#e6e6e6',
        // backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center'
     },
     topTitle: {
        color: '#00b300',
        fontSize: 18,
        fontWeight: '300',
        textAlign:'center'
     },
     bottomTitle: {
        color: '#000',
        fontSize: 35,
        fontWeight: 'bold'
     },
     topTitleDarkBg: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '300',
      textAlign:'center'
   },
   bottomTitleDarkBg: {
      color: '#fff',
      fontSize: 35,
      fontWeight: 'bold'
   },
     bottomCover: {
        position: 'absolute',
        top: hp('17%'),
        width: wp('100%'),
        height: hp('80%'),
        borderRadius: 3,
        borderWidth: 0,
        borderStyle: 'solid',
        borderColor: '#e6e6e6',
        flexWrap: 'wrap',
        alignItems: 'center',
        alignSelf:'center',
        flexDirection: 'row',
        justifyContent: 'space-between'
     },
     card: {
        width: wp('44%'),
        height: hp('24%'),
        margin:10,
        borderRadius: 8,
        borderWidth: 0,
        borderStyle: 'solid',
        // borderColor: '#e6e6e6',
        // backgroundColor: '#ffffff',
        alignItems: 'center',
        alignSelf:'center',
        textAlign: 'center',
        padding: 13
     },
     subLogo: {
        width: 35,
        height: 35,
        alignItems: 'center',
        resizeMode: 'contain',
        margin: 7,
        borderRadius: 3,
        borderWidth: 0,
        borderColor: '#e6e6e6',
     },
     sub: {
        color: '#fff',
        fontSize: 17,
        textAlign: 'center'
     },
     elevation: {
        elevation: 0,
        shadowColor: '#52006A',
     },
     tapBtn:{
        width:wp('35%'),
        height:35,
        borderRadius:40,
        backgroundColor:'#fff',
        alignItems:'center',
        justifyContent:'center',
        alignSelf:'center',
        position:"absolute",
        bottom:9,
     },
     tapBtnDarkBg:{
      width:wp('35%'),
      height:35,
      borderRadius:40,
      backgroundColor:'#000',
      alignItems:'center',
      justifyContent:'center',
      alignSelf:'center',
      position:"absolute",
      bottom:9,
   },
     modeCover:{
      flexDirection:'row',
      justifyContent:'space-between',
      
     },
     modeCaption:{
      marginRight:10,
      color: '#454545',
      fontSize: 14,
      fontWeight: '600'
     },
     modeCaptionDarkBg:{
      marginRight:10,
      color: '#fff',
      fontSize: 14,
      fontWeight: '600'
     }
})