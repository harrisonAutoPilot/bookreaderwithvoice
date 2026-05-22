import {StyleSheet} from "react-native";


const styles = StyleSheet.create({

  padImg: {
    width: 80,
    height: 80,
    marginTop: -80,
    marginBottom:20,
    borderRadius:100,
   
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Urbanist-Regular",
    lineHeight: 28,
    color: "#212121",
    letterSpacing: 0.2,
    fontWeight:"400",
    textAlign: "center",
    
  },
  body5: {
    backgroundColor: 'rgba(233, 235, 249, 1)',
    borderRadius: 10,
    paddingTop: 40,
    padding:5,
    paddingBottom:40,
 
  },
  imageHolder: {
    alignItems: "center",
    justifyContent:'center',
  },

  titleText: {
    fontSize: 16,
    color: '#5f9a32',
    marginTop: 10,
    fontFamily: "Urbanist-SemiBold",
    letterSpacing: 0.1,
    marginBottom: 5,
    lineHeight: 24,
    fontWeight:"600",
  },
  reasonCover: {
    alignItems: 'center',
    paddingHorizontal: 13,
  },
  reasonText: {
    textAlign: 'center',
    fontSize: 14,
    marginRight: 20,
    color: '#424242',
    marginTop: 10,
    fontFamily: "Urbanist-Regular",
    letterSpacing: 0.25,
    fontStyle:'normal',
    fontWeight:"400",
    marginBottom: 5
  },
  btnCover:{
    flexDirection:'row',
    justifyContent:"space-between",
    width:"80%",
    alignSelf:'center',
    marginTop:10
  },
  exitBtn:{
    paddingHorizontal:40,
    paddingVertical:8,
    backgroundColor:"#f5f5f5",
    borderRadius:20,
    borderWidth:1,
    borderColor:"#bfbfbf"
  },
  exitText:{
    color:"#454545",
    fontSize:14,
  }
});

export default styles